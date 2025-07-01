import { z } from 'zod';

// User validation schemas
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores'
  }),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8).max(128),
  avatar: z.string().url().optional()
});

export const LoginUserSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional()
});

// API response schemas
export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  avatar: z.string().nullable(),
  createdAt: z.date()
});

export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string()
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

// Type exports
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type LoginUserInput = z.infer<typeof LoginUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>; 