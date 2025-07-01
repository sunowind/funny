import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';

// 单例模式：保存全局 PrismaClient 实例
let prismaInstance: PrismaClient | undefined;

// 为不同环境创建 Prisma 客户端
export function createPrismaClient(d1Database?: D1Database): PrismaClient {
  // 如果已经有实例，直接返回（避免在同一请求中创建多个连接）
  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    // 在 Cloudflare Workers 环境中使用 D1 适配器
    if (d1Database) {
      console.log('创建 Prisma Client (D1 适配器)');
      const adapter = new PrismaD1(d1Database);
      prismaInstance = new PrismaClient({ adapter });
      return prismaInstance;
    }
    
    // 在本地开发环境中使用标准 SQLite 连接
    console.log('创建 Prisma Client (SQLite)');
    prismaInstance = new PrismaClient();
    return prismaInstance;
  } catch (error) {
    console.error('创建 Prisma Client 失败:', error);
    // 创建失败时返回一个基本的 PrismaClient 实例
    // 这样可以避免运行时错误，但操作会失败
    prismaInstance = new PrismaClient();
    return prismaInstance;
  }
}

// 导出类型定义
export type PrismaClientType = PrismaClient;

// 清理函数 - 用于测试环境
export function clearPrismaInstance(): void {
  if (prismaInstance) {
    prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
} 