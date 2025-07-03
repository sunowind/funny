import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateDocumentStats, clearParseCache, parseMarkdown } from '../app/lib/markdown/parser';
import * as dbModule from '../workers/db/user';
import { getCurrentUser } from '../workers/middleware/auth';
import { DocumentService } from '../workers/services/documentService';
import { ApiError, ApiErrorCodes, createSuccessResponse } from '../workers/types/api';
import { CreateDocumentSchema, DocumentQuerySchema, PatchDocumentSchema } from '../workers/types/document';
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

// Mock dependencies
vi.mock('../workers/services/documentService');
vi.mock('../workers/middleware/auth');

// Mock DOMPurify for performance tests
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html)
  }
}));

// Mock marked for performance tests
vi.mock('marked', () => ({
  marked: vi.fn((content) => `<p>${content}</p>`),
  Renderer: vi.fn(() => ({
    heading: vi.fn(),
    code: vi.fn(),
    table: vi.fn(),
    listitem: vi.fn(),
  }))
}));

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

// Helper function to create test app for advanced document API
function createAdvancedDocumentApp() {
  const app = new Hono();
  
  // Mock auth middleware
  app.use('*', (c, next) => {
    (c as any).set('user', { id: 'test-user-id', email: 'test@example.com' });
    return next();
  });

  return app;
}

// Mock data for advanced document tests
const mockDocument = {
  id: 'doc-123',
  title: '测试文档',
  content: '# 测试标题\n\n这是测试内容。',
  tags: ['测试', '文档'],
  wordCount: 15,
  readingTime: 1,
  lastEditPosition: 0,
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockDocumentList = {
  documents: [
    {
      id: 'doc-123',
      title: '测试文档',
      tags: ['测试'],
      wordCount: 15,
      readingTime: 1,
      lastEditPosition: 0,
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'doc-456',
      title: '另一个文档',
      tags: ['示例'],
      wordCount: 20,
      readingTime: 1,
      lastEditPosition: 100,
      version: 2,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  }
};

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
          return {
            ...mockUsers.adminUser,
            createdAt: new Date(mockUsers.adminUser.createdAt),
            avatar: mockUsers.adminUser.avatar || null
          };
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
        vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue({
          ...mockUsers.adminUser,
          createdAt: new Date(mockUsers.adminUser.createdAt),
          avatar: mockUsers.adminUser.avatar || null
        });
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

  const mockDocumentForBasicTests = {
    id: 'doc-123',
    title: '测试文档',
    content: '# 标题\n\n这是一个测试文档。',
    authorId: 'mock-user-id',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDocumentsForBasicTests = [
    mockDocumentForBasicTests,
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
      mockDocumentOperations.createDocument.mockResolvedValue(mockDocumentForBasicTests);

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
      mockDocumentOperations.getDocument.mockResolvedValue(mockDocumentForBasicTests);

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
        ...mockDocumentForBasicTests,
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
      mockDocumentOperations.getUserDocuments.mockResolvedValue(mockDocumentsForBasicTests);

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

describe('Advanced Document API', () => {
  let mockDocumentService: any;
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createAdvancedDocumentApp();
    mockDocumentService = {
      createDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocuments: vi.fn(),
      updateDocument: vi.fn(),
      patchDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getDocumentStats: vi.fn(),
    };
    
    vi.mocked(DocumentService).mockImplementation(() => mockDocumentService);
    vi.mocked(getCurrentUser).mockReturnValue({ id: 'test-user-id', email: 'test@example.com' });
  });

  describe('Document CRUD Operations', () => {
    beforeEach(() => {
      app.post('/documents', async (c) => {
        try {
          const body = await c.req.json();
          const input = CreateDocumentSchema.parse(body);
          const user = getCurrentUser(c);
          const document = await mockDocumentService.createDocument(user.id, input);
          return c.json(createSuccessResponse(document), 201);
        } catch (error) {
          if (error instanceof Error) {
            throw new ApiError(ApiErrorCodes.VALIDATION_ERROR, error.message);
          }
          throw error;
        }
      });
    });

    it('should create advanced document successfully', async () => {
      mockDocumentService.createDocument.mockResolvedValue(mockDocument);

      const response = await app.request('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '测试文档',
          content: '# 测试标题\n\n这是测试内容。',
          tags: ['测试', '文档']
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('测试文档');
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          title: '测试文档',
          content: '# 测试标题\n\n这是测试内容。',
          tags: ['测试', '文档']
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await app.request('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '内容',
          // missing title
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Document List API', () => {
    beforeEach(() => {
      app.get('/documents', async (c) => {
        try {
          const queryParams = Object.fromEntries(new URL(c.req.url).searchParams);
          const query = DocumentQuerySchema.parse(queryParams);
          const user = getCurrentUser(c);
          const result = await mockDocumentService.getDocuments(user.id, query);
          return c.json(createSuccessResponse(result));
        } catch (error) {
          if (error instanceof Error) {
            throw new ApiError(ApiErrorCodes.VALIDATION_ERROR, error.message);
          }
          throw error;
        }
      });
    });

    it('should list documents with default pagination', async () => {
      mockDocumentService.getDocuments.mockResolvedValue(mockDocumentList);

      const response = await app.request('/documents');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.documents).toHaveLength(2);
      expect(data.data.pagination.page).toBe(1);
      expect(mockDocumentService.getDocuments).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      );
    });

    it('should support search query', async () => {
      mockDocumentService.getDocuments.mockResolvedValue({
        ...mockDocumentList,
        documents: [mockDocumentList.documents[0]]
      });

      const response = await app.request('/documents?search=测试');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(mockDocumentService.getDocuments).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          search: '测试'
        })
      );
    });

    it('should support pagination and sorting parameters', async () => {
      mockDocumentService.getDocuments.mockResolvedValue(mockDocumentList);

      const response = await app.request('/documents?page=2&limit=10&sortBy=title&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(mockDocumentService.getDocuments).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          page: 2,
          limit: 10,
          sortBy: 'title',
          sortOrder: 'asc'
        })
      );
    });
  });

  describe('Document Details API', () => {
    beforeEach(() => {
      app.get('/documents/:id', async (c) => {
        try {
          const documentId = c.req.param('id');
          const user = getCurrentUser(c);
          const document = await mockDocumentService.getDocument(user.id, documentId);
          return c.json(createSuccessResponse(document));
        } catch (error) {
          throw error;
        }
      });
    });

    it('should get document details successfully', async () => {
      mockDocumentService.getDocument.mockResolvedValue(mockDocument);

      const response = await app.request('/documents/doc-123');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('doc-123');
      expect(mockDocumentService.getDocument).toHaveBeenCalledWith('test-user-id', 'doc-123');
    });

    it('should handle non-existent document', async () => {
      mockDocumentService.getDocument.mockRejectedValue(
        new ApiError(ApiErrorCodes.DOCUMENT_NOT_FOUND, '文档不存在', undefined, 404)
      );

      const response = await app.request('/documents/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should handle access denied', async () => {
      mockDocumentService.getDocument.mockRejectedValue(
        new ApiError(ApiErrorCodes.DOCUMENT_ACCESS_DENIED, '无权访问此文档', undefined, 403)
      );

      const response = await app.request('/documents/doc-123');

      expect(response.status).toBe(403);
    });
  });

  describe('Auto Save API', () => {
    beforeEach(() => {
      app.patch('/documents/:id/autosave', async (c) => {
        try {
          const documentId = c.req.param('id');
          const body = await c.req.json();
          const input = PatchDocumentSchema.parse(body);
          const user = getCurrentUser(c);
          const document = await mockDocumentService.patchDocument(user.id, documentId, input);
          return c.json(createSuccessResponse({
            ...document,
            autoSaved: true,
            savedAt: new Date().toISOString(),
          }));
        } catch (error) {
          if (error instanceof Error) {
            throw new ApiError(ApiErrorCodes.VALIDATION_ERROR, error.message);
          }
          throw error;
        }
      });
    });

    it('should auto save content successfully', async () => {
      mockDocumentService.patchDocument.mockResolvedValue(mockDocument);

      const response = await app.request('/documents/doc-123/autosave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '自动保存的内容',
          lastEditPosition: 50
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.autoSaved).toBe(true);
      expect(data.data.savedAt).toBeDefined();
      expect(mockDocumentService.patchDocument).toHaveBeenCalledWith(
        'test-user-id',
        'doc-123',
        expect.objectContaining({
          content: '自动保存的内容',
          lastEditPosition: 50
        })
      );
    });

    it('should handle empty content for auto save', async () => {
      mockDocumentService.patchDocument.mockResolvedValue(mockDocument);

      const response = await app.request('/documents/doc-123/autosave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
        })
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Document Statistics API', () => {
    beforeEach(() => {
      app.get('/documents/:id/stats', async (c) => {
        try {
          const documentId = c.req.param('id');
          const user = getCurrentUser(c);
          const stats = await mockDocumentService.getDocumentStats(user.id, documentId);
          return c.json(createSuccessResponse(stats));
        } catch (error) {
          throw error;
        }
      });
    });

    it('should get document statistics', async () => {
      const mockStats = {
        wordCount: 150,
        readingTime: 1,
        characterCount: 800,
        paragraphCount: 5,
        lastModified: '2024-01-01T00:00:00Z'
      };
      mockDocumentService.getDocumentStats.mockResolvedValue(mockStats);

      const response = await app.request('/documents/doc-123/stats');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual(mockStats);
      expect(mockDocumentService.getDocumentStats).toHaveBeenCalledWith('test-user-id', 'doc-123');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large document lists efficiently', async () => {
      const largeMockList = {
        documents: Array(100).fill(null).map((_, i) => ({
          id: `doc-${i}`,
          title: `文档 ${i}`,
          tags: [`tag-${i}`],
          wordCount: 100 + i,
          readingTime: 1,
          lastEditPosition: 0,
          version: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1,
        }
      };

      mockDocumentService.getDocuments.mockResolvedValue(largeMockList);

      app.get('/documents', async (c) => {
        const user = getCurrentUser(c);
        const query = {
          page: parseInt(c.req.query('page') || '1'),
          limit: parseInt(c.req.query('limit') || '20'),
        };
        const result = await mockDocumentService.getDocuments(user.id, query);
        return c.json(createSuccessResponse(result));
      });

      const startTime = Date.now();
      const response = await app.request('/documents?limit=100');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000);
      
      const data = await response.json();
      expect(data.data.documents).toHaveLength(100);
    });

    it('should handle concurrent requests', async () => {
      mockDocumentService.getDocuments.mockResolvedValue(mockDocumentList);

      app.get('/documents', async (c) => {
        const user = getCurrentUser(c);
        const result = await mockDocumentService.getDocuments(user.id, {});
        return c.json(createSuccessResponse(result));
      });

      const promises = Array(10).fill(null).map(() => app.request('/documents'));
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

describe('API Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearParseCache();
  });

  describe('Markdown Parser Performance', () => {
    it('should handle large documents efficiently', () => {
      const largeContent = Array(1000).fill('这是一行很长的文本内容，包含中文字符和English words。').join('\n');
      
      const startTime = performance.now();
      const result = parseMarkdown(largeContent);
      const endTime = performance.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.length).toBeGreaterThan(0);
    });

    it('should cache parsing results for repeated content', () => {
      const content = '# 标题\n\n这是重复解析的内容。';
      
      // First parse
      const startTime1 = performance.now();
      const result1 = parseMarkdown(content);
      const endTime1 = performance.now();
      
      // Second parse (should use cache)
      const startTime2 = performance.now();
      const result2 = parseMarkdown(content);
      const endTime2 = performance.now();
      
      expect(result1).toBe(result2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
      
      // marked should only be called once due to caching
      expect(vi.mocked(require('marked').marked)).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive parsing requests', () => {
      const contents = Array(100).fill(null).map((_, i) => `# 文档 ${i}\n\n内容 ${i}`);
      
      const startTime = performance.now();
      const results = contents.map(content => parseMarkdown(content));
      const endTime = performance.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Document Statistics Performance', () => {
    it('should calculate stats for large documents quickly', () => {
      const largeContent = Array(10000).fill('word').join(' ');
      
      const startTime = performance.now();
      const stats = calculateDocumentStats(largeContent);
      const endTime = performance.now();
      
      expect(stats.wordCount).toBe(10000);
      expect(stats.characterCount).toBe(largeContent.length);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle mixed language content efficiently', () => {
      const mixedContent = Array(1000).fill('中文 English 日本語 العربية русский').join(' ');
      
      const startTime = performance.now();
      const stats = calculateDocumentStats(mixedContent);
      const endTime = performance.now();
      
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.characterCount).toBe(mixedContent.length);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Cache Performance', () => {
    it('should have efficient cache lookup performance', () => {
      const testContent = '# 缓存测试\n\n这是用于缓存性能测试的内容。';
      
      // Prime the cache
      parseMarkdown(testContent);
      
      // Test multiple cache hits
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        parseMarkdown(testContent);
      }
      const endTime = performance.now();
      
      // All should be cache hits, so should be very fast
      expect(endTime - startTime).toBeLessThan(100);
      
      // marked should only be called once (during cache priming)
      expect(vi.mocked(require('marked').marked)).toHaveBeenCalledTimes(1);
    });

    it('should handle cache clearing efficiently', () => {
      const contents = Array(50).fill(null).map((_, i) => `# 内容 ${i}`);
      
      // Populate cache
      contents.forEach(content => parseMarkdown(content));
      
      // Clear cache and measure time
      const startTime = performance.now();
      clearParseCache();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty content efficiently', () => {
      const startTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        parseMarkdown('');
        calculateDocumentStats('');
      }
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle content with many special characters', () => {
      const specialContent = Array(1000).fill('!@#$%^&*()_+-=[]{}|;:,.<>?').join('\n');
      
      const startTime = performance.now();
      const result = parseMarkdown(specialContent);
      const stats = calculateDocumentStats(specialContent);
      const endTime = performance.now();
      
      expect(result).toBeDefined();
      expect(stats).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
}); 