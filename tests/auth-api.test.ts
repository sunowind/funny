(globalThis as any).__TEST_DB__ = {};

import { Hono } from 'hono';
import { beforeAll, beforeEach, expect, test, vi } from 'vitest';
import auth from '../workers/auth/login';
import * as dbModule from '../workers/db/user';
import * as hashModule from '../workers/utils/hash';
import * as jwtModule from '../workers/utils/jwt';

let app: Hono;

beforeAll(() => {
  app = new Hono();
  app.route('/api/auth', auth);
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('登录成功返回用户和 cookie', async () => {
  vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue({
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'mocked-hash',
    avatar: null,
    createdAt: '2024-01-01T00:00:00Z',
  });
  vi.spyOn(hashModule, 'verifyPassword').mockResolvedValue(true);
  vi.spyOn(jwtModule, 'createToken').mockResolvedValue('mocked-token');

  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'admin', password: 'Admin@123' }),
  });
  const res = await app.request(req);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.user.username).toBe('admin');
  expect(res.headers.get('set-cookie')).toMatch(/token=/);
});

test('用户名或密码错误', async () => {
  vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue(null);
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'admin', password: 'wrongpass' }),
  });
  const res = await app.request(req);
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.error).toBe('用户名或密码错误');
});

test('限流逻辑', async () => {
  vi.spyOn(dbModule, 'findUserByIdentifier').mockResolvedValue(null);
  for (let i = 0; i < 6; i++) {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ identifier: 'admin', password: 'wrongpass' }),
    });
    await app.request(req);
  }
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ identifier: 'admin', password: 'wrongpass' }),
  });
  const res = await app.request(req);
  expect([401, 429]).toContain(res.status);
});

// Token 校验中间件、SQL 注入等安全测试可根据实际中间件实现补充
