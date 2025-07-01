import type { User } from '@prisma/client';
import { hashPassword } from '../utils/hash';
import type { CreateUserInput, UpdateUserInput } from './schema';

// Note: This is a transitional implementation using D1 directly
// In production, this should use Prisma Client with D1 adapter

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

export async function findUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  const sql = `
    SELECT id, username, email, password_hash as passwordHash, avatar, created_at as createdAt
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const result = await db.prepare(sql).bind(id).first<User>();
  return result ?? null;
}

export async function createUser(
  db: D1Database,
  userData: CreateUserInput
): Promise<User> {
  const passwordHash = await hashPassword(userData.password);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  
  const sql = `
    INSERT INTO users (id, username, email, password_hash, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING id, username, email, password_hash as passwordHash, avatar, created_at as createdAt
  `;
  
  const result = await db.prepare(sql)
    .bind(id, userData.username, userData.email, passwordHash, userData.avatar || null, createdAt)
    .first<User>();
    
  if (!result) {
    throw new Error('Failed to create user');
  }
  
  return result;
}

export async function updateUser(
  db: D1Database,
  id: string,
  userData: UpdateUserInput
): Promise<User | null> {
  const updates = [];
  const values = [];
  
  if (userData.username !== undefined) {
    updates.push('username = ?');
    values.push(userData.username);
  }
  if (userData.email !== undefined) {
    updates.push('email = ?');
    values.push(userData.email);
  }
  if (userData.avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(userData.avatar);
  }
  
  if (updates.length === 0) {
    return findUserById(db, id);
  }
  
  values.push(id);
  
  const sql = `
    UPDATE users 
    SET ${updates.join(', ')}
    WHERE id = ?
    RETURNING id, username, email, password_hash as passwordHash, avatar, created_at as createdAt
  `;
  
  const result = await db.prepare(sql).bind(...values).first<User>();
  return result ?? null;
}

export async function deleteUser(
  db: D1Database,
  id: string
): Promise<boolean> {
  const sql = `DELETE FROM users WHERE id = ?`;
  const result = await db.prepare(sql).bind(id).run();
  return result.success && (result.meta.changes > 0);
}

export async function checkUserExists(
  db: D1Database,
  username: string,
  email: string,
  excludeId?: string
): Promise<{ usernameExists: boolean; emailExists: boolean }> {
  let sql = `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE username = ?) as usernameCount,
      (SELECT COUNT(*) FROM users WHERE email = ?) as emailCount
  `;
  let params = [username, email];
  
  if (excludeId) {
    sql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE username = ? AND id != ?) as usernameCount,
        (SELECT COUNT(*) FROM users WHERE email = ? AND id != ?) as emailCount
    `;
    params = [username, excludeId, email, excludeId];
  }
  
  const result = await db.prepare(sql).bind(...params).first<{
    usernameCount: number;
    emailCount: number;
  }>();
  
  return {
    usernameExists: (result?.usernameCount || 0) > 0,
    emailExists: (result?.emailCount || 0) > 0
  };
} 