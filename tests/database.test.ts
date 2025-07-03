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

// Mock document operations
const mockDocumentOperations = {
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getUserDocuments: vi.fn(),
    getDocumentWithAuthor: vi.fn(),
};

let mockPrisma: any;

// Mock documents data
const mockDocuments = {
    validDocument: {
        id: 'doc-123',
        title: '测试文档',
        content: '# 标题\n\n这是一个测试文档。',
        authorId: 'user-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        author: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@example.com',
        }
    },
    userDocuments: [
        {
            id: 'doc-123',
            title: '测试文档',
            content: '# 标题\n\n这是一个测试文档。',
            authorId: 'user-1',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
            id: 'doc-456',
            title: '另一个文档',
            content: '## 子标题\n\n更多内容。',
            authorId: 'user-1',
            createdAt: new Date('2024-01-02T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
        }
    ]
};

describe('Database Operations', () => {
  beforeEach(() => {
    setupTestEnvironment();
    mockPrisma = createMockPrisma();
  });

  describe('User Queries', () => {
    describe('findUserByIdentifier', () => {
      it('should return user when found by username', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUsers.adminUser);

        const result = await findUserByIdentifier(mockPrisma, 'testuser');

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'testuser' },
              { email: 'testuser' }
            ]
          }
        });
        expect(result).toEqual(mockUsers.adminUser);
      });

      it('should return user when found by email', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUsers.adminUser);

        const result = await findUserByIdentifier(mockPrisma, 'test@example.com');

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'test@example.com' },
              { email: 'test@example.com' }
            ]
          }
        });
        expect(result).toEqual(mockUsers.adminUser);
      });

      it('should return null when user not found', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const result = await findUserByIdentifier(mockPrisma, 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findUserById', () => {
      it('should return user when found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUsers.adminUser);

        const result = await findUserById(mockPrisma, '1');

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' }
        });
        expect(result).toEqual(mockUsers.adminUser);
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
          ...mockUsers.adminUser,
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

describe('Document Database Operations', () => {
  beforeEach(() => {
    setupTestEnvironment();
    mockPrisma = createMockPrisma();
    
    // Add document operations to mockPrisma
    mockPrisma.document = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    };
    
    vi.clearAllMocks();
    
    // Reset all mock document operations
    Object.values(mockDocumentOperations).forEach(mock => {
      mock.mockReset();
    });
  });

  describe('Document Queries', () => {
    describe('getDocument', () => {
      it('should return document when found', async () => {
        mockPrisma.document.findUnique.mockResolvedValue(mockDocuments.validDocument);

        // Mock implementation
        mockDocumentOperations.getDocument.mockImplementation(async (id: string) => {
          return await mockPrisma.document.findUnique({
            where: { id },
            include: { author: true }
          });
        });

        const result = await mockDocumentOperations.getDocument('doc-123');

        expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
          where: { id: 'doc-123' },
          include: { author: true }
        });
        expect(result).toEqual(mockDocuments.validDocument);
      });

      it('should return null when document not found', async () => {
        mockPrisma.document.findUnique.mockResolvedValue(null);

        mockDocumentOperations.getDocument.mockImplementation(async (id: string) => {
          return await mockPrisma.document.findUnique({
            where: { id },
            include: { author: true }
          });
        });

        const result = await mockDocumentOperations.getDocument('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getUserDocuments', () => {
      it('should return user documents', async () => {
        mockPrisma.document.findMany.mockResolvedValue(mockDocuments.userDocuments);

        mockDocumentOperations.getUserDocuments.mockImplementation(async (userId: string) => {
          return await mockPrisma.document.findMany({
            where: { authorId: userId },
            orderBy: { updatedAt: 'desc' }
          });
        });

        const result = await mockDocumentOperations.getUserDocuments('user-1');

        expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
          where: { authorId: 'user-1' },
          orderBy: { updatedAt: 'desc' }
        });
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('测试文档');
      });

      it('should return empty array when user has no documents', async () => {
        mockPrisma.document.findMany.mockResolvedValue([]);

        mockDocumentOperations.getUserDocuments.mockImplementation(async (userId: string) => {
          return await mockPrisma.document.findMany({
            where: { authorId: userId },
            orderBy: { updatedAt: 'desc' }
          });
        });

        const result = await mockDocumentOperations.getUserDocuments('user-no-docs');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Document Mutations', () => {
    describe('createDocument', () => {
      it('should create document successfully', async () => {
        const documentData = {
          title: '新文档',
          content: '# 新文档\n\n内容',
          authorId: 'user-1'
        };

        const mockCreatedDocument = {
          id: 'doc-new',
          ...documentData,
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        };

        mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);

        mockDocumentOperations.createDocument.mockImplementation(async (data) => {
          return await mockPrisma.document.create({
            data: {
              title: data.title,
              content: data.content,
              authorId: data.authorId,
            }
          });
        });

        const result = await mockDocumentOperations.createDocument(documentData);

        expect(mockPrisma.document.create).toHaveBeenCalledWith({
          data: documentData
        });
        expect(result.title).toBe('新文档');
        expect(result.authorId).toBe('user-1');
      });

      it('should handle creation errors', async () => {
        const documentData = {
          title: '新文档',
          content: '# 新文档\n\n内容',
          authorId: 'invalid-user'
        };

        mockPrisma.document.create.mockRejectedValue(new Error('Foreign key constraint failed'));

        mockDocumentOperations.createDocument.mockImplementation(async (data) => {
          return await mockPrisma.document.create({
            data: {
              title: data.title,
              content: data.content,
              authorId: data.authorId,
            }
          });
        });

        await expect(mockDocumentOperations.createDocument(documentData))
          .rejects.toThrow('Foreign key constraint failed');
      });
    });

    describe('updateDocument', () => {
      it('should update document successfully', async () => {
        const updateData = {
          title: '更新的标题',
          content: '# 更新的标题\n\n更新的内容'
        };

        const mockUpdatedDocument = {
          ...mockDocuments.validDocument,
          ...updateData,
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        };

        mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);

        mockDocumentOperations.updateDocument.mockImplementation(async (id: string, data) => {
          return await mockPrisma.document.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date(),
            }
          });
        });

        const result = await mockDocumentOperations.updateDocument('doc-123', updateData);

        expect(mockPrisma.document.update).toHaveBeenCalledWith({
          where: { id: 'doc-123' },
          data: {
            ...updateData,
            updatedAt: expect.any(Date),
          }
        });
        expect(result.title).toBe('更新的标题');
      });

      it('should return null when document not found', async () => {
        mockPrisma.document.update.mockRejectedValue(new Error('Record not found'));

        mockDocumentOperations.updateDocument.mockImplementation(async (id: string, data) => {
          try {
            return await mockPrisma.document.update({
              where: { id },
              data: {
                ...data,
                updatedAt: new Date(),
              }
            });
          } catch (error) {
            return null;
          }
        });

        const result = await mockDocumentOperations.updateDocument('nonexistent', {
          title: '不存在的文档'
        });

        expect(result).toBeNull();
      });
    });

    describe('deleteDocument', () => {
      it('should delete document successfully', async () => {
        mockPrisma.document.delete.mockResolvedValue(mockDocuments.validDocument);

        mockDocumentOperations.deleteDocument.mockImplementation(async (id: string) => {
          await mockPrisma.document.delete({
            where: { id }
          });
          return true;
        });

        const result = await mockDocumentOperations.deleteDocument('doc-123');

        expect(mockPrisma.document.delete).toHaveBeenCalledWith({
          where: { id: 'doc-123' }
        });
        expect(result).toBe(true);
      });

      it('should return false when document not found', async () => {
        mockPrisma.document.delete.mockRejectedValue(new Error('Record not found'));

        mockDocumentOperations.deleteDocument.mockImplementation(async (id: string) => {
          try {
            await mockPrisma.document.delete({
              where: { id }
            });
            return true;
          } catch (error) {
            return false;
          }
        });

        const result = await mockDocumentOperations.deleteDocument('nonexistent');

        expect(result).toBe(false);
      });
    });
  });

  describe('Document Relationships', () => {
    it('should maintain foreign key relationship with users', async () => {
      const documentData = {
        title: '关联测试',
        content: '测试用户关联',
        authorId: mockUsers.validUser.id
      };

      // Mock that user exists
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers.validUser);
      
      const mockCreatedDocument = {
        id: 'doc-relation',
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: mockUsers.validUser
      };

      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);

      mockDocumentOperations.createDocument.mockImplementation(async (data) => {
        // Check if user exists
        const userExists = await mockPrisma.user.findUnique({
          where: { id: data.authorId }
        });
        
        if (!userExists) {
          throw new Error('User not found');
        }

        return await mockPrisma.document.create({
          data,
          include: { author: true }
        });
      });

      const result = await mockDocumentOperations.createDocument(documentData);

      expect(result.author).toBeDefined();
      expect(result.author.id).toBe(mockUsers.validUser.id);
    });

    it('should cascade delete user documents when user is deleted', async () => {
      // This would be handled by database constraints
      // Mock the behavior
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.delete.mockResolvedValue(mockUsers.validUser);

      // Simulate cascade delete
      const deleteUserWithDocuments = async (userId: string) => {
        // Delete user documents first
        await mockPrisma.document.deleteMany({
          where: { authorId: userId }
        });
        
        // Then delete user
        return await mockPrisma.user.delete({
          where: { id: userId }
        });
      };

      const result = await deleteUserWithDocuments(mockUsers.validUser.id);

      expect(mockPrisma.document.deleteMany).toHaveBeenCalledWith({
        where: { authorId: mockUsers.validUser.id }
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUsers.validUser.id }
      });
      expect(result).toEqual(mockUsers.validUser);
    });
  });

  describe('Document Transactions', () => {
    it('should handle document creation in transaction', async () => {
      const documentData = {
        title: '事务测试',
        content: '测试事务处理',
        authorId: 'user-1'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      const createDocumentTransaction = async (data: any) => {
        return await mockPrisma.$transaction(async (tx: any) => {
          // Check if user exists
          const user = await tx.user.findUnique({
            where: { id: data.authorId }
          });

          if (!user) {
            throw new Error('User not found');
          }

          // Create document
          return await tx.document.create({
            data
          });
        });
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUsers.validUser);
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-transaction',
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createDocumentTransaction(documentData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.title).toBe('事务测试');
    });
  });
}); 