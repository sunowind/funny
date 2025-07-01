import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { CreateUserSchema, type CreateUserInput } from '../db/schema';
import { checkUserExists, createUser } from '../db/user';
import { getValidatedData, validate } from '../middleware/validation';
import type { SafeUser } from '../types/api';
import { createToken } from '../utils/jwt';

const registerRoute = new Hono();

registerRoute.post('/register', validate({ json: CreateUserSchema }), async (c) => {
  try {
    const db = (c.env && (c.env as any).DB) || (globalThis as any).__TEST_DB__;
    const userData = getValidatedData<CreateUserInput>(c);

    // Check if username or email already exists
    const existingUser = await checkUserExists(db, userData.username, userData.email);
    
    if (existingUser.usernameExists) {
      return c.json({
        success: false,
        error: 'Username already exists',
        message: 'This username is already taken'
      }, 409);
    }
    
    if (existingUser.emailExists) {
      return c.json({
        success: false,
        error: 'Email already exists',
        message: 'This email is already registered'
      }, 409);
    }

    // Create new user
    const user = await createUser(db, userData);

    // Generate JWT token
    const token = await createToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });

    // Set HTTP-only cookie
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
      message: 'User registered successfully'
    }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle database constraint violations
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: 'User already exists',
        message: 'Username or email already exists'
      }, 409);
    }
    
    return c.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration'
    }, 500);
  }
});

export default registerRoute; 