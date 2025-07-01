import { Hono } from 'hono';
import { createPrismaClient } from '../db/client';
import { CreateUserSchema, type CreateUserInput } from '../db/schema';
import { checkUserExists, createUser } from '../db/user';
import { getValidatedData, validate } from '../middleware/validation';
import type { ApiResponse, AuthResponse, SafeUser } from '../types/api';
import { createToken } from '../utils/jwt';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.post('/register', validate({ json: CreateUserSchema }), async (c) => {
  try {
    const userData = getValidatedData<CreateUserInput>(c);
    
    // 创建 Prisma 客户端（使用 D1 适配器）
    const prisma = createPrismaClient(c.env.DB);

    // 检查用户名和邮箱是否已存在
    const { usernameExists, emailExists } = await checkUserExists(
      prisma,
      userData.username,
      userData.email
    );

    if (usernameExists) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Username already exists',
        message: 'Please choose a different username'
      }, 409);
    }

    if (emailExists) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Email already exists',
        message: 'An account with this email already exists'
      }, 409);
    }

    // 创建新用户
    const newUser = await createUser(prisma, userData);

    // 创建安全的用户对象（移除密码）
    const safeUser: SafeUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
    };

    // 生成 JWT token
    const token = await createToken({ userId: newUser.id, username: newUser.username });

    // 设置 cookie
    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        token
      },
      message: 'Registration successful'
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    
    // 处理数据库约束错误
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'User already exists',
        message: 'Username or email already taken'
      }, 409);
    }

    return c.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }, 500);
  }
});

export default app; 