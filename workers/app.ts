import { Hono } from 'hono'
import { createRequestHandler } from 'react-router'
import loginRoute from './auth/login'
import registerRoute from './auth/register'

const app = new Hono()

// 挂载认证相关路由
app.route('/api/auth', loginRoute)
app.route('/api/auth', registerRoute)

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