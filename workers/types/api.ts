import type { User } from '@prisma/client';

// Prisma types re-export
export type { User } from '@prisma/client';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User API types
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  avatar?: string;
}

// Sanitized user type (without password)
export type SafeUser = Omit<User, 'passwordHash'>;

// Authentication response type
export interface AuthResponse {
  user: SafeUser;
  token: string;
}

// Auth context type
export interface AuthUser extends SafeUser {
  token?: string;
}

// Database context type for Cloudflare Workers
export interface DatabaseContext {
  db: D1Database;
  prisma?: any; // Will be defined when Prisma D1 adapter is implemented
}

// API错误代码
export const ApiErrorCodes = {
  // 通用错误
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  
  // 文档相关错误
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ACCESS_DENIED: 'DOCUMENT_ACCESS_DENIED',
  DOCUMENT_CREATION_FAILED: 'DOCUMENT_CREATION_FAILED',
  DOCUMENT_UPDATE_FAILED: 'DOCUMENT_UPDATE_FAILED',
  DOCUMENT_DELETE_FAILED: 'DOCUMENT_DELETE_FAILED',
  
  // 用户相关错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // 网络相关错误
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
} as const

export type ApiErrorCode = typeof ApiErrorCodes[keyof typeof ApiErrorCodes]

// API错误类
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 成功响应构造函数
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

// 错误响应构造函数
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

// Cloudflare Workers环境类型
export interface WorkerEnv {
  DB: D1Database;
  JWT_SECRET: string;
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW?: string;
} 