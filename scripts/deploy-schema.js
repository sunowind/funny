#!/usr/bin/env node

/**
 * 部署数据库模式到 Cloudflare D1 数据库
 * 这个脚本会生成 SQL 并使用 wrangler 执行到 D1 数据库
 */

import { execSync } from 'child_process';
import fs from 'fs';

// 读取配置
const wranglerToml = fs.readFileSync('wrangler.toml', 'utf8');
const dbName = wranglerToml.match(/database_name\s*=\s*"([^"]+)"/)?.[1];

if (!dbName) {
  console.error('❌ 无法从 wrangler.toml 中找到数据库名称');
  process.exit(1);
}

console.log(`🚀 开始部署数据库模式到 Cloudflare D1 数据库: ${dbName}`);

try {
  // 1. 生成 Prisma Client（确保类型是最新的）
  console.log('📦 生成 Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 2. 创建迁移 SQL
  console.log('📝 生成迁移 SQL...');
  execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migration_temp.sql', { stdio: 'inherit' });
  
  // 3. 修改 SQL 文件，添加 IF NOT EXISTS
  console.log('🔧 修改 SQL 以处理表已存在的情况...');
  const migrationSql = fs.readFileSync('migration_temp.sql', 'utf8')
    .replace(/CREATE TABLE "([^"]+)"/g, 'CREATE TABLE IF NOT EXISTS "$1"')
    .replace(/CREATE UNIQUE INDEX "([^"]+)"/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "$1"')
    .replace(/CREATE INDEX "([^"]+)"/g, 'CREATE INDEX IF NOT EXISTS "$1"');
  
  fs.writeFileSync('migration.sql', migrationSql);
  fs.unlinkSync('migration_temp.sql');

  // 4. 执行到 D1 数据库
  console.log('🎯 执行 SQL 到 D1 数据库...');
  execSync(`npx wrangler d1 execute ${dbName} --file=migration.sql`, { stdio: 'inherit' });

  // 5. 清理临时文件
  if (fs.existsSync('migration.sql')) {
    fs.unlinkSync('migration.sql');
    console.log('🧹 清理临时文件');
  }

  console.log('✅ 数据库模式部署成功！');

} catch (error) {
  console.error('❌ 部署失败:', error.message);
  
  // 清理临时文件
  if (fs.existsSync('migration_temp.sql')) {
    fs.unlinkSync('migration_temp.sql');
  }
  if (fs.existsSync('migration.sql')) {
    fs.unlinkSync('migration.sql');
  }
  
  process.exit(1);
} 