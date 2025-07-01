import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateUserInput, UpdateUserInput } from '../workers/db/schema';
import {
    checkUserExists,
    createUser,
    deleteUser,
    findUserById,
    findUserByIdentifier,
    updateUser
} from '../workers/db/user';
import {
    createMockDb,
    mockUsers,
    setupTestEnvironment,
    testInputs
} from './helpers/test-utils';

describe('Database Operations', () => {
  let mockDb: any;
  let mockStatement: any;

  beforeEach(() => {
    setupTestEnvironment();
    const mocks = createMockDb();
    mockDb = mocks.mockDb;
    mockStatement = mocks.mockStatement;
  });

  describe('User Queries', () => {
    describe('findUserByIdentifier', () => {
      it('should return user when found by username', async () => {
        mockStatement.first.mockResolvedValue(mockUsers.validUser);

        const result = await findUserByIdentifier(mockDb, 'testuser');

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
        expect(mockStatement.bind).toHaveBeenCalledWith('testuser', 'testuser');
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return user when found by email', async () => {
        mockStatement.first.mockResolvedValue(mockUsers.validUser);

        const result = await findUserByIdentifier(mockDb, 'test@example.com');

        expect(mockStatement.bind).toHaveBeenCalledWith('test@example.com', 'test@example.com');
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return null when user not found', async () => {
        mockStatement.first.mockResolvedValue(null);

        const result = await findUserByIdentifier(mockDb, 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findUserById', () => {
      it('should return user when found', async () => {
        mockStatement.first.mockResolvedValue(mockUsers.validUser);

        const result = await findUserById(mockDb, '1');

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'));
        expect(mockStatement.bind).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return null when user not found', async () => {
        mockStatement.first.mockResolvedValue(null);

        const result = await findUserById(mockDb, 'nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('User Mutations', () => {
    describe('createUser', () => {
      it('should create a new user successfully', async () => {
        const userData: CreateUserInput = testInputs.validRegistration;
        const mockCreatedUser = {
          ...mockUsers.validUser,
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar,
        };

        mockStatement.first.mockResolvedValue(mockCreatedUser);

        const result = await createUser(mockDb, userData);

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'));
        expect(result).toEqual(mockCreatedUser);
      });

      it('should create user without avatar', async () => {
        const { avatar, ...userDataWithoutAvatar } = testInputs.validRegistration;
        const mockCreatedUser = {
          ...mockUsers.validUser,
          username: userDataWithoutAvatar.username,
          email: userDataWithoutAvatar.email,
          avatar: null,
        };

        mockStatement.first.mockResolvedValue(mockCreatedUser);

        const result = await createUser(mockDb, userDataWithoutAvatar);

        expect(result.avatar).toBeNull();
      });

      it('should throw error when user creation fails', async () => {
        const userData: CreateUserInput = testInputs.validRegistration;
        mockStatement.first.mockResolvedValue(null);

        await expect(createUser(mockDb, userData)).rejects.toThrow('Failed to create user');
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const updateData: UpdateUserInput = {
          username: 'updateduser',
          email: 'updated@example.com'
        };
        const mockUpdatedUser = {
          ...mockUsers.validUser,
          ...updateData
        };

        mockStatement.first.mockResolvedValue(mockUpdatedUser);

        const result = await updateUser(mockDb, '1', updateData);

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'));
        expect(result).toEqual(mockUpdatedUser);
      });

      it('should update only provided fields', async () => {
        const updateData: UpdateUserInput = { username: 'newusername' };
        const mockUpdatedUser = {
          ...mockUsers.validUser,
          username: 'newusername'
        };

        mockStatement.first.mockResolvedValue(mockUpdatedUser);

        const result = await updateUser(mockDb, '1', updateData);

        expect(mockStatement.bind).toHaveBeenCalledWith('newusername', '1');
        expect(result?.username).toBe('newusername');
      });

      it('should return existing user when no updates provided', async () => {
        mockStatement.first.mockResolvedValue(mockUsers.validUser);

        const result = await updateUser(mockDb, '1', {});

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
        expect(result).toEqual(mockUsers.validUser);
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        mockStatement.run.mockResolvedValue({
          success: true,
          meta: { changes: 1 }
        });

        const result = await deleteUser(mockDb, '1');

        expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
        expect(mockStatement.bind).toHaveBeenCalledWith('1');
        expect(result).toBe(true);
      });

      it('should return false when no user deleted', async () => {
        mockStatement.run.mockResolvedValue({
          success: true,
          meta: { changes: 0 }
        });

        const result = await deleteUser(mockDb, 'nonexistent');

        expect(result).toBe(false);
      });

      it('should return false when operation fails', async () => {
        mockStatement.run.mockResolvedValue({
          success: false,
          meta: { changes: 0 }
        });

        const result = await deleteUser(mockDb, '1');

        expect(result).toBe(false);
      });
    });
  });

  describe('User Validation', () => {
    describe('checkUserExists', () => {
      it('should check if username and email exist', async () => {
        mockStatement.first.mockResolvedValue({
          usernameCount: 1,
          emailCount: 0
        });

        const result = await checkUserExists(mockDb, 'testuser', 'test@example.com');

        expect(result).toEqual({
          usernameExists: true,
          emailExists: false
        });
      });

      it('should return false when neither exists', async () => {
        mockStatement.first.mockResolvedValue({
          usernameCount: 0,
          emailCount: 0
        });

        const result = await checkUserExists(mockDb, 'newuser', 'new@example.com');

        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });

      it('should exclude specific user ID when checking', async () => {
        mockStatement.first.mockResolvedValue({
          usernameCount: 0,
          emailCount: 0
        });

        const result = await checkUserExists(mockDb, 'testuser', 'test@example.com', 'exclude-id');

        expect(mockStatement.bind).toHaveBeenCalledWith('testuser', 'exclude-id', 'test@example.com', 'exclude-id');
        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });

      it('should handle null response gracefully', async () => {
        mockStatement.first.mockResolvedValue(null);

        const result = await checkUserExists(mockDb, 'testuser', 'test@example.com');

        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });
    });
  });
}); 