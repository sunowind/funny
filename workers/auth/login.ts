import * as bcrypt from 'bcrypt-ts';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { z } from 'zod';
import { shouldRateLimit } from '../../app/utils/rate-limit';

declare global {
  // eslint-disable-next-line no-var
  var __loginAttempts: Record<string, { count: number; last: number }> | undefined;
}

// Mock user data (for demo, replace with DB in prod)
const users = [
  {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: bcrypt.hashSync('Password123!', 10), // 预先 hash
    avatar: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
  },
];

// Zod schema for login
const loginSchema = z.object({
  identifier: z.string().min(3), // username or email
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

// Simple in-memory rate limit (for demo)
const loginAttempts: Record<string, { count: number; last: number }> = globalThis.__loginAttempts = globalThis.__loginAttempts || {};
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

const auth = new Hono();

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    // 参数错误也返回 401，防止暴力破解
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  const { identifier, password, remember } = parse.data;
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();

  // 使用纯函数判断限流
  if (shouldRateLimit(loginAttempts, ip, now, MAX_ATTEMPTS, WINDOW_MS)) {
    return c.json({ error: '登录过于频繁，请稍后再试' }, 429);
  }

  // Find user
  const user = users.find(
    (u) => u.username === identifier || u.email === identifier
  );
  if (!user) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  // Check password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  // JWT payload
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  };
  const secret = (c.env as any)?.JWT_SECRET || 'dev-secret';
  const token = await sign(payload, secret);

  // Set cookie
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 2, // 30天 or 2小时
  });

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
    message: '登录成功',
  });
});

export default auth;
export { loginAttempts };
