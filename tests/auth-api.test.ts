import { Hono } from 'hono';
import { beforeAll, beforeEach, expect, test } from 'vitest';
import auth from '../workers/auth/login';

let app: Hono;

// @ts-ignore
import { loginAttempts } from '../workers/auth/login';

beforeAll(() => {
  app = new Hono();
  app.route('/api/auth', auth);
});

beforeEach(() => {
  // @ts-ignore
  for (const key in loginAttempts) delete loginAttempts[key];
});

test('登录成功返回用户和 cookie', async () => {
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'testuser', password: 'Password123!' }),
  });
  const res = await app.request(req);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.user.username).toBe('testuser');
  expect(res.headers.get('set-cookie')).toMatch(/token=/);
});

test('用户名或密码错误', async () => {
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'testuser', password: 'Password1234' }),
  });
  const res = await app.request(req);
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.error).toBe('用户名或密码错误');
});

test('限流逻辑', async () => {
  for (let i = 0; i < 6; i++) {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ identifier: 'testuser', password: 'Password1234' }),
    });
    await app.request(req);
  }
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'testuser', password: 'Password1234' }),
  });
  const res = await app.request(req);
  expect(res.status).toBe(429);
  const data = await res.json();
  expect(data.error).toMatch(/登录过于频繁/);
});
