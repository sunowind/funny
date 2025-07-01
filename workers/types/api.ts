import type { User } from '@prisma/client';

// Prisma types re-export
export type { User } from '@prisma/client';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

// Auth context type
export interface AuthUser extends SafeUser {
  token?: string;
}

// Database context type for Cloudflare Workers
export interface DatabaseContext {
  db: D1Database;
  prisma?: any; // Will be defined when Prisma D1 adapter is implemented
} 