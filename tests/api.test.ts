import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbModule from '../workers/db/user';
import * as hashModule from '../workers/utils/hash';
import * as jwtModule from '../workers/utils/jwt';
import {
    createMockPrisma,
    createTestRequest,
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationError,
    mockUsers,
    setupTestEnvironment,
    testInputs
} from './helpers/test-utils';
import { createTestLoginRoute, createTestRegisterRoute } from './mocks/auth-routes';

// Mock document operations
const mockDocumentOperations = {
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getUserDocuments: vi.fn(),
};

// Mock document route
function createTestDocumentRoute(mockPrisma: any) {
    const app = new Hono();
    
    // Create document
    app.post('/documents', async (c) => {
        try {
            const body = await c.req.json();
            const { title, content } = body;
            
            if (!title || !content) {
                return c.json({ error: 'Title and content are required' }, 400);
            }
            
            const document = await mockDocumentOperations.createDocument({
                title,
                content,
                authorId: 'mock-user-id'
            });
            
            return c.json({ success: true, data: document });
        } catch (error) {
            return c.json({ error: 'Internal server error' }, 500);
        }
    });
    
    // Get document
    app.get('/documents/:id', async (c) => {
        try {
            const id = c.req.param('id');
            const document = await mockDocumentOperations.getDocument(id);
            
            if (!document) {
                return c.json({ error: 'Document not found' }, 404);
            }
            
            return c.json({ success: true, data: document });
        } catch (error) {
            return c.json({ error: 'Internal server error' }, 500);
        }
    });
    
    // Update document
    app.put('/documents/:id', async (c) => {
        try {
            const id = c.req.param('id');
            const body = await c.req.json();
            const { title, content } = body;
            
            const document = await mockDocumentOperations.updateDocument(id, {
                title,
                content
            });
            
            if (!document) {
                return c.json({ error: 'Document not found' }, 404);
            }
            
            return c.json({ success: true, data: document });
        } catch (error) {
            return c.json({ error: 'Internal server error' }, 500);
        }
    });
    
    // Get user documents
    app.get('/documents', async (c) => {
        try {
            const documents = await mockDocumentOperations.getUserDocuments('mock-user-id');
            return c.json({ success: true, data: documents });
        } catch (error) {
            return c.json({ error: 'Internal server error' }, 500);
        }
    });
    
    return app;
}

describe('Authentication API', () => {
  let app: Hono;
  let mockPrisma: any;

  beforeEach(() => {
    setupTestEnvironment();
    vi.restoreAllMocks();
    
    // 创建模拟的Prisma客户端
    mockPrisma = createMockPrisma();
    
    // 创建测试应用
    app = new Hono();
    app.route('/api/auth', createTestLoginRoute(mockPrisma));
    app.route('/api/auth', createTestRegisterRoute(mockPrisma));
  });

  describe('Login API', () => {
    describe('Successful Login', () => {
      beforeEach(() => {
        vi.spyOn(dbModule, 'findUserByIdentifier').mockImplementation(async (_, identifier) => {
          return mockUsers.adminUser;
        });
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
        vi.spyOn(dbModule, 'createUser').mockImplementation(async (_, userData) => {
          return {
            id: 'new-user-id',
            username: userData.username,
            email: userData.email,
            passwordHash: 'hashed-password',
            avatar: userData.avatar || null,
            createdAt: new Date('2024-01-01T00:00:00Z'),
          };
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

describe('Document API', () => {
  let app: Hono;
  let mockPrisma: any;

  const mockDocument = {
    id: 'doc-123',
    title: '测试文档',
    content: '# 标题\n\n这是一个测试文档。',
    authorId: 'mock-user-id',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDocuments = [
    mockDocument,
    {
      id: 'doc-456',
      title: '另一个文档',
      content: '## 子标题\n\n更多内容。',
      authorId: 'mock-user-id',
      createdAt: new Date('2024-01-02T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    }
  ];

  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
    
    mockPrisma = createMockPrisma();
    app = new Hono();
    app.route('/api', createTestDocumentRoute(mockPrisma));
  });

  describe('Create Document', () => {
    it('should create document successfully', async () => {
      mockDocumentOperations.createDocument.mockResolvedValue(mockDocument);

      const req = createTestRequest('http://localhost/api/documents', 'POST', {
        title: '测试文档',
        content: '# 标题\n\n这是一个测试文档。'
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expectSuccessResponse(data);
      expect(data.data.title).toBe('测试文档');
      expect(mockDocumentOperations.createDocument).toHaveBeenCalledWith({
        title: '测试文档',
        content: '# 标题\n\n这是一个测试文档。',
        authorId: 'mock-user-id'
      });
    });

    it('should reject empty title', async () => {
      const req = createTestRequest('http://localhost/api/documents', 'POST', {
        title: '',
        content: '内容'
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expectErrorResponse(data, 'Title and content are required');
    });

    it('should reject empty content', async () => {
      const req = createTestRequest('http://localhost/api/documents', 'POST', {
        title: '标题',
        content: ''
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expectErrorResponse(data, 'Title and content are required');
    });

    it('should handle database errors', async () => {
      mockDocumentOperations.createDocument.mockRejectedValue(new Error('Database error'));

      const req = createTestRequest('http://localhost/api/documents', 'POST', {
        title: '测试文档',
        content: '内容'
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expectErrorResponse(data, 'Internal server error');
    });
  });

  describe('Get Document', () => {
    it('should get document successfully', async () => {
      mockDocumentOperations.getDocument.mockResolvedValue(mockDocument);

      const req = createTestRequest('http://localhost/api/documents/doc-123', 'GET');

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expectSuccessResponse(data);
      expect(data.data.id).toBe('doc-123');
      expect(mockDocumentOperations.getDocument).toHaveBeenCalledWith('doc-123');
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentOperations.getDocument.mockResolvedValue(null);

      const req = createTestRequest('http://localhost/api/documents/nonexistent', 'GET');

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expectErrorResponse(data, 'Document not found');
    });
  });

  describe('Update Document', () => {
    it('should update document successfully', async () => {
      const updatedDocument = {
        ...mockDocument,
        title: '更新的标题',
        content: '更新的内容',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      
      mockDocumentOperations.updateDocument.mockResolvedValue(updatedDocument);

      const req = createTestRequest('http://localhost/api/documents/doc-123', 'PUT', {
        title: '更新的标题',
        content: '更新的内容'
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expectSuccessResponse(data);
      expect(data.data.title).toBe('更新的标题');
      expect(mockDocumentOperations.updateDocument).toHaveBeenCalledWith('doc-123', {
        title: '更新的标题',
        content: '更新的内容'
      });
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentOperations.updateDocument.mockResolvedValue(null);

      const req = createTestRequest('http://localhost/api/documents/nonexistent', 'PUT', {
        title: '更新的标题',
        content: '更新的内容'
      });

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expectErrorResponse(data, 'Document not found');
    });
  });

  describe('Get User Documents', () => {
    it('should get user documents successfully', async () => {
      mockDocumentOperations.getUserDocuments.mockResolvedValue(mockDocuments);

      const req = createTestRequest('http://localhost/api/documents', 'GET');

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expectSuccessResponse(data);
      expect(data.data).toHaveLength(2);
      expect(mockDocumentOperations.getUserDocuments).toHaveBeenCalledWith('mock-user-id');
    });

    it('should handle empty document list', async () => {
      mockDocumentOperations.getUserDocuments.mockResolvedValue([]);

      const req = createTestRequest('http://localhost/api/documents', 'GET');

      const res = await app.request(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expectSuccessResponse(data);
      expect(data.data).toHaveLength(0);
    });
  });
}); 