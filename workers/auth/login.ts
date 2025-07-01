import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { LoginUserSchema, type LoginUserInput } from '../db/schema';
import { findUserByIdentifier } from '../db/user';
import { getValidatedData, validate } from '../middleware/validation';
import type { SafeUser } from '../types/api';
import { verifyPassword } from '../utils/hash';
import { createToken } from '../utils/jwt';

const loginRoute = new Hono();

loginRoute.get('/*', c => c.text('login GET ok'));

loginRoute.post('/login', validate({ json: LoginUserSchema }), async (c) => {
  try {
    const db = (c.env && (c.env as any).DB) || (globalThis as any).__TEST_DB__;
    const { identifier, password } = getValidatedData<LoginUserInput>(c);

    const user = await findUserByIdentifier(db, identifier);
    if (!user) {
      return c.json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      }, 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      }, 401);
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Create safe user object (without password hash)
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    return c.json({
      success: true,
      data: {
        user: safeUser,
        token
      },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }, 500);
  }
});

export default loginRoute;
