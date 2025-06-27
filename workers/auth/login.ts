import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { findUserByIdentifier } from '../db/user';
import { hashPassword, verifyPassword } from '../utils/hash';
import { createToken } from '../utils/jwt';

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

const loginRoute = new Hono();


loginRoute.post('/login', async (c) => {
  const db = c.env.DB as D1Database;
  
  const body = await c.req.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  const { identifier, password, remember } = parse.data;

  console.log(hashPassword("Admin@123"));
  

  const user = await findUserByIdentifier(db, identifier);
  if (!user) {
    return c.json({ error: 'findUserByIdentifier' }, 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'verifyPassword' }, 401);
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

  console.log(user);
  

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


export default loginRoute;
