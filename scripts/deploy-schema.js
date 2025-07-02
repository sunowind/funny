#!/usr/bin/env node

/**
 * 部署数据库模式到 Cloudflare D1 数据库
 * 这个脚本会生成 SQL 并使用 wrangler 执行到 D1 数据库
 * 同时会将迁移文件保存到 migrations 目录下，使用递增编号命名
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 读取配置
const wranglerToml = fs.readFileSync('wrangler.toml', 'utf8');
const dbName = wranglerToml.match(/database_name\s*=\s*"([^"]+)"/)?.[1];

if (!dbName) {
  console.error('❌ 无法从 wrangler.toml 中找到数据库名称');
  process.exit(1);
}

console.log(`🚀 开始部署数据库模式到 Cloudflare D1 数据库: ${dbName}`);

// 确保 migrations 目录存在
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('📁 创建 migrations 目录');
}

// 生成递增编号的迁移文件名
// 获取命令行参数，如果有提供描述则使用，否则默认为 "schema"
const args = process.argv.slice(2);
const description = args.length > 0 ? args[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase() : 'schema';

// 检查 migrations 目录中的文件，获取最大编号
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.match(/^\d{3}_.+\.sql$/))
  .map(f => parseInt(f.split('_')[0], 10));
const nextNumber = files.length > 0 ? Math.max(...files) + 1 : 1;
const paddedNumber = String(nextNumber).padStart(3, '0');
const migrationName = `${paddedNumber}_${description}.sql`;
const migrationFilePath = path.join(migrationsDir, migrationName);

try {
  // 1. 生成 Prisma Client（确保类型是最新的）
  console.log('📦 生成 Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 2. 生成迁移 SQL，直接输出到 migrations 目录
  console.log('📝 生成迁移 SQL...');
  execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "${migrationFilePath}"`, { stdio: 'inherit' });
  console.log(`💾 保存迁移文件到: ${migrationFilePath}`);

  // 3. 执行到 D1 数据库
  console.log('🎯 执行 SQL 到 D1 数据库...');
  execSync(`npx wrangler d1 execute ${dbName} --file="${migrationFilePath}"`, { stdio: 'inherit' });

  console.log('✅ 数据库模式部署成功！');
  console.log(`📋 迁移历史已保存到: ${migrationFilePath}`);

} catch (error) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
} 