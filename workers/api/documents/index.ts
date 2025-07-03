import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { errorHandler } from '../../middleware/errorHandler'
import type { WorkerEnv } from '../../types/api'

// 创建文档路由实例
const documents = new Hono<{ Bindings: WorkerEnv }>()

// 应用错误处理中间件
documents.use('*', errorHandler)

// 导入子路由
import { authMiddleware } from '../../middleware/auth'
import { createRateLimitMiddleware, performanceMiddleware } from '../../middleware/performance'
import analyticsRoute from './analytics'
import autosaveRoute from './autosave'
import conflictRoute from './conflict'
import createRoute from './create'
import deleteRoute from './delete'
import detailRoute from './detail'
import listRoute from './list'
import updateRoute from './update'

// 应用性能监控中间件
documents.use('*', performanceMiddleware)

// 应用限流中间件（每分钟120次请求）
documents.use('*', createRateLimitMiddleware(120))

// 健康检查路由 - 不需要认证
documents.get('/health', (c) => {
  return c.json({ 
    success: true, 
    message: 'Documents API is healthy',
    timestamp: new Date().toISOString()
  })
})

// 数据库连接测试路由 - 不需要认证
documents.get('/db-test', async (c) => {
  try {
    console.log('Testing database connection')
    
    if (!c.env.DB) {
      return c.json({
        success: false,
        message: 'DB binding is not available',
        timestamp: new Date().toISOString()
      }, 500)
    }
    
    // 检查D1数据库是否可用
    try {
      const result = await c.env.DB.prepare('SELECT 1 as test').first()
      console.log('D1 raw query result:', result)
    } catch (error) {
      console.error('D1 raw query failed:', error)
    }
    
    try {
      const adapter = new PrismaD1(c.env.DB)
      const prisma = new PrismaClient({ adapter })
      
      // 尝试执行一个简单查询
      console.log('Attempting to count users...')
      const userCount = await prisma.user.count()
      console.log('User count:', userCount)
      
      console.log('Attempting to count documents...')
      const docCount = await prisma.document.count()
      console.log('Document count:', docCount)
      
      return c.json({
        success: true,
        message: 'Database connection successful',
        data: {
          userCount,
          docCount
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Prisma query failed:', error)
      throw error
    }
  } catch (error) {
    console.error('Database connection test failed:', error)
    return c.json({
      success: false,
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// 对需要认证的路由应用认证中间件
documents.use('/', authMiddleware)
documents.use('/:id', authMiddleware)
documents.use('/analytics/*', authMiddleware)

// 挂载子路由
documents.route('/', createRoute)
documents.route('/', listRoute)
documents.route('/', detailRoute)
documents.route('/', updateRoute)
documents.route('/', deleteRoute)
documents.route('/', autosaveRoute)
documents.route('/', conflictRoute)
documents.route('/', analyticsRoute)

export default documents 