import type { User } from '@prisma/client';
import { vi } from 'vitest';

// 测试用户数据
export const mockUsers = {
  validUser: {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    avatar: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  } as User,
  
  userWithAvatar: {
    id: '2',
    username: 'avataruser',
    email: 'avatar@example.com',
    passwordHash: 'hashedpassword',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  } as User,
  
  adminUser: {
    id: '3',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'hashedpassword',
    avatar: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  } as User,
};

// 测试输入数据
export const testInputs = {
  validLogin: {
    identifier: 'testuser',
    password: 'password123',
  },
  
  validRegistration: {
    username: 'newuser',
    email: 'new@example.com',
    password: 'password123',
    avatar: 'https://example.com/avatar.jpg',
  },
  
  invalidInputs: {
    shortUsername: { username: 'ab', email: 'test@example.com', password: 'password123' },
    invalidEmail: { username: 'testuser', email: 'invalid-email', password: 'password123' },
    shortPassword: { username: 'testuser', email: 'test@example.com', password: '123' },
    emptyIdentifier: { identifier: '', password: 'password123' },
    emptyPassword: { identifier: 'testuser', password: '' },
  },
};

// D1 Database Mock Factory
export function createMockDb() {
  const mockStatement = {
    bind: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };

  const mockDb = {
    prepare: vi.fn(),
    exec: vi.fn(),
  };

  // Setup chainable mock
  mockDb.prepare.mockReturnValue(mockStatement);
  mockStatement.bind.mockReturnValue(mockStatement);

  return { mockDb, mockStatement };
}

// API Response Helpers
export const apiResponses = {
  success: <T>(data: T, message = 'Success') => ({
    success: true,
    data,
    message,
  }),
  
  error: (error: string, message: string, details?: any) => ({
    success: false,
    error,
    message,
    details,
  }),
  
  validationError: (fields: Array<{ path: string; message: string }>) => ({
    success: false,
    error: 'Validation failed',
    message: 'Invalid request data',
    details: fields,
  }),
};

// Test Environment Setup
export function setupTestEnvironment() {
  // Setup global test database
  (globalThis as any).__TEST_DB__ = {};
  
  // Clear all mocks before each test
  vi.clearAllMocks();
}

// HTTP Request Builder
export function createTestRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  headers: Record<string, string> = {}
) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
    ...headers,
  };

  return new Request(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Assertion Helpers
export function expectValidationError(response: any, expectedPath?: string) {
  expect(response.success).toBe(false);
  expect(response.error).toBe('Validation failed');
  expect(response.details).toBeDefined();
  
  if (expectedPath) {
    expect(response.details.some((d: any) => d.path.includes(expectedPath))).toBe(true);
  }
}

export function expectSuccessResponse(response: any, expectedData?: any) {
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
  
  if (expectedData) {
    expect(response.data).toMatchObject(expectedData);
  }
}

export function expectErrorResponse(response: any, expectedError: string) {
  expect(response.success).toBe(false);
  expect(response.error).toBe(expectedError);
} 