import { Hono } from 'hono';
import { CreateUserSchema, LoginUserSchema, type CreateUserInput, type LoginUserInput } from '../../workers/db/schema';
import { checkUserExists, createUser, findUserByIdentifier } from '../../workers/db/user';
import { getValidatedData, validate } from '../../workers/middleware/validation';
import type { ApiResponse, AuthResponse, SafeUser } from '../../workers/types/api';
import { verifyPassword } from '../../workers/utils/hash';
import { createToken } from '../../workers/utils/jwt';

// 模拟版本的登录路由，不依赖于环境变量
export const createTestLoginRoute = (mockPrisma: any) => {
  const app = new Hono();
  
  app.post('/login', validate({ json: LoginUserSchema }), async (c) => {
    try {
      const { identifier, password } = getValidatedData<LoginUserInput>(c);
      
      // 使用传入的模拟Prisma客户端
      const user = await findUserByIdentifier(mockPrisma, identifier);
      if (!user) {
        return c.json<ApiResponse<never>>({
          success: false,
          error: 'Authentication failed',
          message: 'Invalid credentials'
        }, 401);
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return c.json<ApiResponse<never>>({
          success: false,
          error: 'Authentication failed',
          message: 'Invalid credentials'
        }, 401);
      }

      const safeUser: SafeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      };

      const token = await createToken({ userId: user.id, username: user.username });
      c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);

      return c.json<ApiResponse<AuthResponse>>({
        success: true,
        data: {
          user: safeUser,
          token
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }, 500);
    }
  });

  return app;
};

// 模拟版本的注册路由，不依赖于环境变量
export const createTestRegisterRoute = (mockPrisma: any) => {
  const app = new Hono();
  
  app.post('/register', validate({ json: CreateUserSchema }), async (c) => {
    try {
      const userData = getValidatedData<CreateUserInput>(c);
      
      // 使用传入的模拟Prisma客户端
      const { usernameExists, emailExists } = await checkUserExists(
        mockPrisma,
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

      const newUser = await createUser(mockPrisma, userData);

      const safeUser: SafeUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt,
      };

      const token = await createToken({ userId: newUser.id, username: newUser.username });
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

  return app;
}; 