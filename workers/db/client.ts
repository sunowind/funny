import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';

// 为不同环境创建 Prisma 客户端
export function createPrismaClient(d1Database?: D1Database): PrismaClient {
  // 在 Cloudflare Workers 环境中使用 D1 适配器
  if (d1Database) {
    const adapter = new PrismaD1(d1Database);
    return new PrismaClient({ adapter });
  }
  
  // 在本地开发环境中使用标准 SQLite 连接
  return new PrismaClient();
}

// 导出类型定义
export type PrismaClientType = PrismaClient; 