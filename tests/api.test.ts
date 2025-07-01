import { Hono } from 'hono';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import loginRoute from '../workers/auth/login';
import registerRoute from '../workers/auth/register';
import * as dbModule from '../workers/db/user';
import * as hashModule from '../workers/utils/hash';
import * as jwtModule from '../workers/utils/jwt';
import {
    createTestRequest,
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationError,
    mockUsers,
    setupTestEnvironment,
    testInputs
} from './helpers/test-utils';

describe('Authentication API', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/api/auth', loginRoute);
    app.route('/api/auth', registerRoute);
  });

  beforeEach(() => {
    setupTestEnvironment();
    vi.restoreAllMocks();
  });

  describe('Login API', () => {
    describe('Successful Login', () => {
      beforeEach(() => {
        vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue(mockUsers.adminUser);
        vi.spyOn(hashModule, 'verifyPassword').mockResolvedValue(true);
        vi.spyOn(jwtModule, 'createToken').mockResolvedValue('mocked-token');
      });

      it('should login with username', async () => {
        const req = createTestRequest('http://localhost/api/auth/login', 'POST', {
          identifier: 'admin',
          password: 'Admin@123'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expectSuccessResponse(data);
        expect(data.data.user.username).toBe('admin');
        expect(data.data.token).toBe('mocked-token');
        expect(res.headers.get('set-cookie')).toMatch(/token=/);
      });

      it('should login with email', async () => {
        const req = createTestRequest('http://localhost/api/auth/login', 'POST', {
          identifier: 'admin@example.com',
          password: 'Admin@123'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expectSuccessResponse(data);
        expect(dbModule.findUserByIdentifier).toHaveBeenCalledWith(
          expect.anything(),
          'admin@example.com'
        );
      });
    });

    describe('Login Failures', () => {
      it('should reject invalid credentials - user not found', async () => {
        vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue(null);

        const req = createTestRequest('http://localhost/api/auth/login', 'POST', {
          identifier: 'nonexistent',
          password: 'wrongpass'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expectErrorResponse(data, 'Authentication failed');
      });

      it('should reject invalid credentials - wrong password', async () => {
        vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue(mockUsers.adminUser);
        vi.spyOn(hashModule, 'verifyPassword').mockResolvedValue(false);

        const req = createTestRequest('http://localhost/api/auth/login', 'POST', {
          identifier: 'admin',
          password: 'wrongpass'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expectErrorResponse(data, 'Authentication failed');
      });
    });

    describe('Input Validation', () => {
      it('should reject empty identifier', async () => {
        const req = createTestRequest('http://localhost/api/auth/login', 'POST', 
          testInputs.invalidInputs.emptyIdentifier
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data, 'identifier');
      });

      it('should reject empty password', async () => {
        const req = createTestRequest('http://localhost/api/auth/login', 'POST',
          testInputs.invalidInputs.emptyPassword
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data, 'password');
      });

      it('should reject malformed JSON', async () => {
        const req = new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data);
      });
    });
  });

  describe('Registration API', () => {
    describe('Successful Registration', () => {
      beforeEach(() => {
        vi.spyOn(dbModule, 'checkUserExists').mockResolvedValue({
          usernameExists: false,
          emailExists: false
        });
        vi.spyOn(dbModule, 'createUser').mockResolvedValue({
          id: 'new-user-id',
          username: 'newuser',
          email: 'new@example.com',
          passwordHash: 'hashed-password',
          avatar: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        });
        vi.spyOn(jwtModule, 'createToken').mockResolvedValue('new-token');
      });

      it('should register new user successfully', async () => {
        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.validRegistration
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expectSuccessResponse(data);
        expect(data.data.user.username).toBe('newuser');
        expect(data.data.token).toBe('new-token');
      });

      it('should register user without avatar', async () => {
        const { avatar, ...registrationWithoutAvatar } = testInputs.validRegistration;
        
        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          registrationWithoutAvatar
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expectSuccessResponse(data);
        expect(dbModule.createUser).toHaveBeenCalledWith(
          expect.anything(),
          expect.not.objectContaining({ avatar: expect.anything() })
        );
      });
    });

    describe('Registration Conflicts', () => {
      it('should reject duplicate username', async () => {
        vi.spyOn(dbModule, 'checkUserExists').mockResolvedValue({
          usernameExists: true,
          emailExists: false
        });

        const req = createTestRequest('http://localhost/api/auth/register', 'POST', {
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(409);
        expectErrorResponse(data, 'Username already exists');
      });

      it('should reject duplicate email', async () => {
        vi.spyOn(dbModule, 'checkUserExists').mockResolvedValue({
          usernameExists: false,
          emailExists: true
        });

        const req = createTestRequest('http://localhost/api/auth/register', 'POST', {
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123'
        });
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(409);
        expectErrorResponse(data, 'Email already exists');
      });
    });

    describe('Registration Validation', () => {
      it('should reject invalid username', async () => {
        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.invalidInputs.shortUsername
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data, 'username');
      });

      it('should reject invalid email', async () => {
        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.invalidInputs.invalidEmail
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data, 'email');
      });

      it('should reject short password', async () => {
        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.invalidInputs.shortPassword
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data, 'password');
      });

      it('should reject invalid avatar URL', async () => {
        const invalidData = {
          ...testInputs.validRegistration,
          avatar: 'not-a-valid-url'
        };

        const req = createTestRequest('http://localhost/api/auth/register', 'POST', invalidData);
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expectValidationError(data);
      });
    });

    describe('Database Errors', () => {
      it('should handle database constraint violations', async () => {
        vi.spyOn(dbModule, 'checkUserExists').mockResolvedValue({
          usernameExists: false,
          emailExists: false
        });
        vi.spyOn(dbModule, 'createUser').mockRejectedValue(
          new Error('UNIQUE constraint failed: users.username')
        );

        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.validRegistration
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(409);
        expectErrorResponse(data, 'User already exists');
      });

      it('should handle unexpected database errors', async () => {
        vi.spyOn(dbModule, 'checkUserExists').mockResolvedValue({
          usernameExists: false,
          emailExists: false
        });
        vi.spyOn(dbModule, 'createUser').mockRejectedValue(
          new Error('Database connection failed')
        );

        const req = createTestRequest('http://localhost/api/auth/register', 'POST',
          testInputs.validRegistration
        );
        
        const res = await app.request(req);
        const data = await res.json();

        expect(res.status).toBe(500);
        expectErrorResponse(data, 'Internal server error');
      });
    });
  });
}); 