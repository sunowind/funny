import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { findUserByIdentifier } from '../db/user';
import { verifyPassword } from '../utils/hash';
import { createToken } from '../utils/jwt';

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

const loginRoute = new Hono();

loginRoute.get('/*', c => c.text('login GET ok'));

loginRoute.post('/login', async (c) => {
  try {
    const db = (c.env && (c.env as any).DB) || (globalThis as any).__TEST_DB__;
    
    const body = await c.req.json();
    const parse = loginSchema.safeParse(body);
    if (!parse.success) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }
    const { identifier, password, remember } = parse.data;

    const user = await findUserByIdentifier(db, identifier);
    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const token = await createToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });

    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 2,
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
  } catch (err) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default loginRoute;
