CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 删除现有的用户（如果存在）
DELETE FROM users WHERE username = 'admin';

INSERT INTO users (id, username, email, password_hash, avatar, created_at) VALUES (
  '1',
  'admin',
  'admin@example.com',
  '$2b$10$vhg5F0Q1jlQJ4b4V1Dzfce9YVUpQNtQf6vjSScmnrJUui/0qypY8u',
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);