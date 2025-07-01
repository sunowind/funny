import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    createMockPrisma,
    mockUsers,
    setupTestEnvironment,
    testInputs
} from './helpers/test-utils';

// Mock the Prisma client creation
vi.mock('../workers/db/client', () => ({
  createPrismaClient: vi.fn(() => mockPrisma),
}));

let mockPrisma: any;

describe('Database Operations', () => {
  beforeEach(() => {
    setupTestEnvironment();
    mockPrisma = createMockPrisma();
  });

  describe('User Queries', () => {
    describe('findUserByIdentifier', () => {
      it('should return user when found by username', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUsers.validUser);

        const result = await findUserByIdentifier(mockPrisma, 'testuser');

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'testuser' },
              { email: 'testuser' }
            ]
          }
        });
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return user when found by email', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUsers.validUser);

        const result = await findUserByIdentifier(mockPrisma, 'test@example.com');

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'test@example.com' },
              { email: 'test@example.com' }
            ]
          }
        });
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return null when user not found', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const result = await findUserByIdentifier(mockPrisma, 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findUserById', () => {
      it('should return user when found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUsers.validUser);

        const result = await findUserById(mockPrisma, '1');

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' }
        });
        expect(result).toEqual(mockUsers.validUser);
      });

      it('should return null when user not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const result = await findUserById(mockPrisma, 'nonexistent');

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

        mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

        const result = await createUser(mockPrisma, userData);

        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: {
            username: userData.username,
            email: userData.email,
            passwordHash: expect.any(String),
            avatar: userData.avatar,
          }
        });
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

        mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

        const result = await createUser(mockPrisma, userDataWithoutAvatar);

        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: {
            username: userDataWithoutAvatar.username,
            email: userDataWithoutAvatar.email,
            passwordHash: expect.any(String),
            avatar: null,
          }
        });
        expect(result.avatar).toBeNull();
      });

      it('should handle creation errors properly', async () => {
        const userData: CreateUserInput = testInputs.validRegistration;
        mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

        await expect(createUser(mockPrisma, userData)).rejects.toThrow('Database error');
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

        mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

        const result = await updateUser(mockPrisma, '1', updateData);

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: '1' },
          data: updateData
        });
        expect(result).toEqual(mockUpdatedUser);
      });

      it('should update only provided fields', async () => {
        const updateData: UpdateUserInput = { username: 'newusername' };
        const mockUpdatedUser = {
          ...mockUsers.validUser,
          username: 'newusername'
        };

        mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

        const result = await updateUser(mockPrisma, '1', updateData);

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: '1' },
          data: updateData
        });
        expect(result?.username).toBe('newusername');
      });

      it('should return existing user when no updates provided', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUsers.validUser);

        const result = await updateUser(mockPrisma, '1', {});

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' }
        });
        expect(result).toEqual(mockUsers.validUser);
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        mockPrisma.user.delete.mockResolvedValue(mockUsers.validUser);

        const result = await deleteUser(mockPrisma, '1');

        expect(mockPrisma.user.delete).toHaveBeenCalledWith({
          where: { id: '1' }
        });
        expect(result).toBe(true);
      });

      it('should return false when user not found', async () => {
        mockPrisma.user.delete.mockRejectedValue(new Error('User not found'));

        const result = await deleteUser(mockPrisma, 'nonexistent');

        expect(result).toBe(false);
      });
    });
  });

  describe('User Validation', () => {
    describe('checkUserExists', () => {
      it('should check if username and email exist', async () => {
        mockPrisma.user.count
          .mockResolvedValueOnce(1) // username count
          .mockResolvedValueOnce(0); // email count

        const result = await checkUserExists(mockPrisma, 'testuser', 'test@example.com');

        expect(mockPrisma.user.count).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
          usernameExists: true,
          emailExists: false
        });
      });

      it('should return false when neither exists', async () => {
        mockPrisma.user.count
          .mockResolvedValueOnce(0) // username count
          .mockResolvedValueOnce(0); // email count

        const result = await checkUserExists(mockPrisma, 'newuser', 'new@example.com');

        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });

      it('should exclude specific user ID when checking', async () => {
        mockPrisma.user.count
          .mockResolvedValueOnce(0) // username count
          .mockResolvedValueOnce(0); // email count

        const result = await checkUserExists(mockPrisma, 'testuser', 'test@example.com', 'exclude-id');

        expect(mockPrisma.user.count).toHaveBeenCalledWith({
          where: {
            username: 'testuser',
            NOT: { id: 'exclude-id' }
          }
        });
        expect(mockPrisma.user.count).toHaveBeenCalledWith({
          where: {
            email: 'test@example.com',
            NOT: { id: 'exclude-id' }
          }
        });
        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });

      it('should handle null response gracefully', async () => {
        mockPrisma.user.count
          .mockResolvedValueOnce(0) // username count
          .mockResolvedValueOnce(0); // email count

        const result = await checkUserExists(mockPrisma, 'testuser', 'test@example.com');

        expect(result).toEqual({
          usernameExists: false,
          emailExists: false
        });
      });
    });
  });
}); 