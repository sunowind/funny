import { Hono } from 'hono';
import { createPrismaClient } from '../db/client';
import { LoginUserSchema, type LoginUserInput } from '../db/schema';
import { findUserByIdentifier } from '../db/user';
import { getValidatedData, validate } from '../middleware/validation';
import type { ApiResponse, AuthResponse, SafeUser } from '../types/api';
import { verifyPassword } from '../utils/hash';
import { createToken } from '../utils/jwt';

interface Env {
  DB: D1Database;
  NODE_ENV?: string;
}

const app = new Hono<{ Bindings: Env }>();

// 简单的内存频率限制器（生产环境应使用Redis或KV）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// 获取客户端IP地址
function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP') || 
         c.req.header('X-Forwarded-For') || 
         c.req.header('X-Real-IP') || 
         '127.0.0.1';
}

// 检查频率限制
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    // 重置或创建新的限制记录
    rateLimitMap.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 }); // 15分钟窗口
    return true;
  }
  
  if (limit.count >= 5) { // 15分钟内最多5次尝试
    return false;
  }
  
  limit.count++;
  return true;
}

// 添加延迟以防止时序攻击
function addSecurityDelay(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, Math.random() * 1000 + 500); // 500-1500ms随机延迟
  });
}

app.post('/login', validate({ json: LoginUserSchema }), async (c) => {
  const clientIP = getClientIP(c);
  
  try {
    // 检查频率限制
    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Too many attempts',
        message: '登录尝试过于频繁，请15分钟后重试'
      }, 429);
    }

    const { identifier, password, rememberMe = false } = getValidatedData<LoginUserInput>(c);
    
    // 创建 Prisma 客户端（使用 D1 适配器）
    const prisma = createPrismaClient(c.env.DB);
    
    // 查找用户
    const user = await findUserByIdentifier(prisma, identifier);
    
    if (!user) {
      // 添加延迟以防止时序攻击
      await addSecurityDelay();
      console.warn(`Login attempt with non-existent user: ${identifier} from IP: ${clientIP}`);
      
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Authentication failed',
        message: '用户名或密码错误'
      }, 401);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // 添加延迟以防止时序攻击
      await addSecurityDelay();
      console.warn(`Invalid password for user: ${identifier} from IP: ${clientIP}`);
      
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Authentication failed',
        message: '用户名或密码错误'
      }, 401);
    }

    // 登录成功，重置该IP的失败计数
    rateLimitMap.delete(clientIP);

    // 创建安全的用户对象（移除密码）
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    // 生成 JWT token
    // 根据"记住我"选项设置不同的过期时间
    const tokenExpirationDays = rememberMe ? 30 : 7; // 记住我：30天，普通：7天
    const expirationTime = Math.floor(Date.now() / 1000) + (tokenExpirationDays * 24 * 60 * 60);
    
    const token = await createToken({ 
      userId: user.id, 
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: expirationTime,
      rememberMe
    });

    // 设置安全的 cookie
    const isProduction = c.env.NODE_ENV === 'production';
    const cookieMaxAge = tokenExpirationDays * 24 * 60 * 60; // 转换为秒
    const cookieOptions = [
      `token=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${cookieMaxAge}`,
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    c.header('Set-Cookie', cookieOptions);
    
    // 设置安全头部
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    if (isProduction) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // 记录成功登录
    console.log(`Successful login for user: ${user.username} from IP: ${clientIP}, rememberMe: ${rememberMe}`);

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        token
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // 记录安全事件
    console.error(`Login error for IP: ${clientIP}`, error);
    
    return c.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      message: '服务器暂时不可用，请稍后重试'
    }, 500);
  }
});

// 获取当前用户信息
app.get('/me', async (c) => {
  try {
    // 从 cookie 读取 token
    const cookie = c.req.header('Cookie') || '';
    const tokenMatch = cookie.match(/token=([^;]+)/);
    if (!tokenMatch) {
      return c.json({ 
        success: false, 
        error: 'Unauthorized', 
        message: '未登录' 
      }, 401);
    }
    
    const token = tokenMatch[1];
    
    // 校验 token
    const payload = await (await import('../utils/jwt')).verifyToken(token);
    if (!payload || !payload.userId) {
      return c.json({ 
        success: false, 
        error: 'Invalid token', 
        message: '登录已过期，请重新登录' 
      }, 401);
    }
    
    // 查找用户
    const prisma = createPrismaClient(c.env.DB);
    const user = await (await import('../db/user')).findUserById(prisma, payload.userId);
    if (!user) {
      return c.json({ 
        success: false, 
        error: 'User not found', 
        message: '用户不存在' 
      }, 404);
    }
    
    // 构造安全用户对象
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
    
    return c.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error', 
      message: '获取用户信息失败' 
    }, 500);
  }
});

// 退出登录
app.post('/logout', async (c) => {
  try {
    const clientIP = getClientIP(c);
    
    // 清除 token cookie
    const isProduction = c.env.NODE_ENV === 'production';
    const cookieOptions = [
      'token=',
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    c.header('Set-Cookie', cookieOptions);
    
    console.log(`User logged out from IP: ${clientIP}`);
    
    return c.json<ApiResponse<{ success: true }>>({
      success: true,
      data: { success: true },
      message: '退出登录成功'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      message: '退出登录失败'
    }, 500);
  }
});

export default app;
