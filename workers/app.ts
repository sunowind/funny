import { Hono } from 'hono'
import { createRequestHandler } from 'react-router'
import documentsRoute from './api/documents'
import loginRoute from './auth/login'
import registerRoute from './auth/register'
import type { WorkerEnv } from './types/api'

const app = new Hono<{ Bindings: WorkerEnv }>()

// 设置开发环境的JWT密钥
app.use('*', async (c, next) => {
  // 如果没有设置JWT_SECRET，则使用开发环境的默认密钥
  if (!c.env.JWT_SECRET) {
    console.log('Setting development JWT_SECRET')
    c.env.JWT_SECRET = 'development-jwt-secret-key-change-in-production'
  }
  await next()
})

// 挂载认证相关路由
app.route('/api/auth', loginRoute)
app.route('/api/auth', registerRoute)

// 挂载文档管理路由
app.route('/api/documents', documentsRoute)

// SSR 路由兜底，必须放在最后
app.get('*', (c) => {
  const requestHandler = createRequestHandler(
    () => import('virtual:react-router/server-build'),
    import.meta.env.MODE,
  )
  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  })
})

export default app