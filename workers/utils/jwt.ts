import { sign, verify } from 'hono/jwt';

const JWT_SECRET = (typeof globalThis !== 'undefined' && (globalThis as any).JWT_SECRET) || 'your-secret';

export function createToken(payload: Record<string, any>): Promise<string> {
  return sign(payload, JWT_SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, any> | null> {
  try {
    return await verify(token, JWT_SECRET);
  } catch {
    return null;
  }
} 