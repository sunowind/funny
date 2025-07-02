import { Hono } from 'hono';
import { createPrismaClient } from '../db/client';
import { LoginUserSchema, type LoginUserInput } from '../db/schema';
import { findUserByIdentifier } from '../db/user';
import { getValidatedData, validate } from '../middleware/validation';
import type { ApiResponse, AuthResponse, SafeUser } from '../types/api';
import { verifyPassword } from '../utils/hash';
import { createToken } from '../utils/jwt';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.post('/login', validate({ json: LoginUserSchema }), async (c) => {
  try {
    const { identifier, password } = getValidatedData<LoginUserInput>(c);
    
    // 创建 Prisma 客户端（使用 D1 适配器）
    const prisma = createPrismaClient(c.env.DB);
    
    // 查找用户
    const user = await findUserByIdentifier(prisma, identifier);
    
    if (!user) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      }, 401);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      }, 401);
    }

    // 创建安全的用户对象（移除密码）
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    // 生成 JWT token
    const token = await createToken({ userId: user.id, username: user.username });

    // 设置 cookie
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

// 新增：获取当前用户信息
app.get('/me', async (c) => {
  try {
    // 从 cookie 读取 token
    const cookie = c.req.header('Cookie') || '';
    const tokenMatch = cookie.match(/token=([^;]+)/);
    if (!tokenMatch) {
      return c.json({ success: false, error: '未登录', message: 'No token found' }, 401);
    }
    const token = tokenMatch[1];
    // 校验 token
    const payload = await (await import('../utils/jwt')).verifyToken(token);
    if (!payload || !payload.userId) {
      return c.json({ success: false, error: '无效 token', message: 'Invalid token' }, 401);
    }
    // 查找用户
    const prisma = createPrismaClient(c.env.DB);
    const user = await (await import('../db/user')).findUserById(prisma, payload.userId);
    if (!user) {
      return c.json({ success: false, error: '用户不存在', message: 'User not found' }, 404);
    }
    // 构造安全用户对象
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
    return c.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    return c.json({ success: false, error: '服务器错误', message: 'Failed to get user' }, 500);
  }
});

export default app;
