CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO users (id, username, email, password_hash, avatar, created_at) VALUES (
  '1',
  'admin',
  'Admin@123',
  '$2b$10$gBkVVjmYv5.cV8srfcqRY.OViU2G9RKPWFUD4BREcid1duw06PIKC',
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);