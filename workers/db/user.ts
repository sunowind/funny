import type { User } from '../types/user';

export async function findUserByIdentifier(
  db: D1Database,
  identifier: string
): Promise<User | null> {
  const sql = `
    SELECT id, username, email, password_hash as passwordHash, avatar, created_at as createdAt
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;
  const result = await db.prepare(sql).bind(identifier, identifier).first<User>();
  return result ?? null;
} 