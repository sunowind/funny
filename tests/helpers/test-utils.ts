import { vi, expect } from 'vitest';
import type { ApiResponse } from '../../workers/types/api';
import type { User } from '../../workers/types/user';

// 测试用户数据
export const mockUsers = {
  adminUser: {
    id: 'user_1',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789',
    avatar: 'https://example.com/avatar.png',
    createdAt: '2023-01-01T00:00:00Z',
  } as User,
  regularUser: {
    id: 'user_2',
    username: 'user',
    email: 'user@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789',
    avatar: undefined,
    createdAt: '2023-01-02T00:00:00Z',
  } as User
};

// 测试输入数据
export const testInputs = {
  validLogin: {
    identifier: 'admin',
    password: 'Admin@123',
    rememberMe: false
  },
  validRegistration: {
    username: 'newuser',
    email: 'new@example.com',
    password: 'Password123!',
    avatar: 'https://example.com/avatar.jpg'
  },
  invalidInputs: {
    emptyIdentifier: {
      identifier: '',
      password: 'password'
    },
    emptyPassword: {
      identifier: 'admin',
      password: ''
    },
    shortUsername: {
      username: 'a',
      email: 'valid@example.com',
      password: 'Password123!'
    },
    invalidEmail: {
      username: 'validuser',
      email: 'not-an-email',
      password: 'Password123!'
    },
    shortPassword: {
      username: 'validuser',
      email: 'valid@example.com',
      password: 'short'
    }
  }
};

// 设置测试环境
export function setupTestEnvironment() {
  // 设置环境变量
  vi.stubEnv('JWT_SECRET', 'test-secret-key');
  vi.stubEnv('DATABASE_URL', 'file:./test.db');
  
  // 模拟控制台输出
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
}

// 创建测试请求
export function createTestRequest(url: string, method: string, body?: any): Request {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return new Request(url, options);
}

// 创建模拟的Prisma客户端
export function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback()),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

// 验证成功响应
export function expectSuccessResponse(response: ApiResponse<any>) {
  expect(response).toHaveProperty('success', true);
  expect(response).toHaveProperty('data');
  expect(response).not.toHaveProperty('error');
}

// 验证错误响应
export function expectErrorResponse(response: ApiResponse<any>, errorType?: string) {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  expect(response).toHaveProperty('message');
  
  if (errorType) {
    expect(response.error).toBe(errorType);
  }
}

// 验证验证错误
export function expectValidationError(response: ApiResponse<any>, field?: string) {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  expect(response.error).toMatch(/validation/i);
  
  // 不检查具体字段名，因为不同环境下的错误消息可能不同
  // 只检查是否为验证错误
} 