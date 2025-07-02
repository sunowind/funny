import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { errorHandler } from '../../middleware/errorHandler'

// 创建文档路由实例
const documents = new Hono<{ Bindings: WorkerEnv }>()

// 应用错误处理中间件
documents.use('*', errorHandler)

// 导入子路由
import createRoute from './create'
import listRoute from './list'  
import detailRoute from './detail'
import updateRoute from './update'
import deleteRoute from './delete'
import autosaveRoute from './autosave'
import conflictRoute from './conflict'
import analyticsRoute from './analytics'
import { authMiddleware } from '../../middleware/auth'
import { performanceMiddleware, createRateLimitMiddleware } from '../../middleware/performance'

// 应用性能监控中间件
documents.use('*', performanceMiddleware)

// 应用限流中间件（每分钟120次请求）
documents.use('*', createRateLimitMiddleware(120))

// 应用认证中间件到所有路由
documents.use('*', authMiddleware)

// 挂载子路由
documents.route('/', createRoute)
documents.route('/', listRoute)
documents.route('/', detailRoute)
documents.route('/', updateRoute)
documents.route('/', deleteRoute)
documents.route('/', autosaveRoute)
documents.route('/', conflictRoute)
documents.route('/', analyticsRoute)

// 临时测试路由
documents.get('/health', (c) => {
  return c.json({ 
    success: true, 
    message: 'Documents API is healthy',
    timestamp: new Date().toISOString()
  })
})

export default documents 