import type { MiddlewareHandler } from 'hono';

export const rateLimit: MiddlewareHandler = async (c, next) => {
  await next();
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
  await next();
}; 