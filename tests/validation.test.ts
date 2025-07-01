import { describe, expect, it } from 'vitest';
import {
    ApiErrorSchema,
    AuthResponseSchema,
    CreateUserSchema,
    LoginUserSchema,
    UpdateUserSchema,
    UserResponseSchema
} from '../workers/db/schema';
import { mockUsers, testInputs } from './helpers/test-utils';

describe('Schema Validation', () => {
  describe('CreateUserSchema', () => {
    it('should validate valid user creation data', () => {
      const result = CreateUserSchema.safeParse(testInputs.validRegistration);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testInputs.validRegistration);
      }
    });

    it('should allow optional avatar', () => {
      const { avatar, ...dataWithoutAvatar } = testInputs.validRegistration;
      const result = CreateUserSchema.safeParse(dataWithoutAvatar);
      expect(result.success).toBe(true);
    });

    describe('Username validation', () => {
      it('should reject short username', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.shortUsername);
        expect(result.success).toBe(false);
      });

      it('should reject username with special characters', () => {
        const invalidData = {
          ...testInputs.validRegistration,
          username: 'test@user!'
        };
        const result = CreateUserSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Username can only contain');
        }
      });
    });

    describe('Email validation', () => {
      it('should reject invalid email format', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.invalidEmail);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Invalid email format');
        }
      });
    });

    describe('Password validation', () => {
      it('should reject short password', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.shortPassword);
        expect(result.success).toBe(false);
      });
    });

    describe('Avatar validation', () => {
      it('should reject invalid avatar URL', () => {
        const invalidData = {
          ...testInputs.validRegistration,
          avatar: 'not-a-valid-url'
        };
        const result = CreateUserSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('LoginUserSchema', () => {
    it('should validate valid login data', () => {
      const result = LoginUserSchema.safeParse(testInputs.validLogin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testInputs.validLogin);
      }
    });

    it('should accept email as identifier', () => {
      const validData = {
        identifier: 'test@example.com',
        password: 'password123'
      };
      const result = LoginUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty identifier', () => {
      const result = LoginUserSchema.safeParse(testInputs.invalidInputs.emptyIdentifier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Username or email is required');
      }
    });

    it('should reject empty password', () => {
      const result = LoginUserSchema.safeParse(testInputs.invalidInputs.emptyPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Password is required');
      }
    });
  });

  describe('UpdateUserSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        username: 'newusername',
        email: 'new@example.com'
      };
      const result = UpdateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should allow empty update object', () => {
      const result = UpdateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid username format', () => {
      const invalidData = { username: 'user@invalid' };
      const result = UpdateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Response Schemas', () => {
    describe('UserResponseSchema', () => {
      it('should validate user response data', () => {
        const result = UserResponseSchema.safeParse(mockUsers.userWithAvatar);
        expect(result.success).toBe(true);
      });

      it('should allow null avatar', () => {
        const result = UserResponseSchema.safeParse(mockUsers.validUser);
        expect(result.success).toBe(true);
      });
    });

    describe('AuthResponseSchema', () => {
      it('should validate authentication response', () => {
        const validData = {
          user: mockUsers.validUser,
          token: 'jwt-token-here'
        };
        const result = AuthResponseSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    describe('ApiErrorSchema', () => {
      it('should validate API error response', () => {
        const validData = {
          error: 'Validation failed',
          message: 'Invalid input data',
          details: { field: 'username', reason: 'too short' }
        };
        const result = ApiErrorSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow minimal error response', () => {
        const validData = {
          error: 'Internal error',
          message: 'Something went wrong'
        };
        const result = ApiErrorSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });
}); 