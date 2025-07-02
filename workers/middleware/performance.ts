import type { Context, Next } from 'hono'
import type { WorkerEnv } from '../types/api'

// 性能监控中间件
export async function performanceMiddleware(c: Context<{ Bindings: WorkerEnv }>, next: Next) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  
  // 添加请求ID到响应头
  c.header('X-Request-ID', requestId)
  
  // 记录请求开始
  console.log(`[${requestId}] ${c.req.method} ${c.req.path} - Started`)
  
  try {
    await next()
    
    const duration = Date.now() - startTime
    const status = c.res?.status || 200
    
    // 记录请求完成
    console.log(`[${requestId}] ${c.req.method} ${c.req.path} - ${status} (${duration}ms)`)
    
    // 添加性能头
    c.header('X-Response-Time', `${duration}ms`)
    
    // 如果响应时间过长，记录警告
    if (duration > 1000) {
      console.warn(`[${requestId}] Slow request: ${duration}ms`)
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] ${c.req.method} ${c.req.path} - Error (${duration}ms):`, error)
    throw error
  }
}

// 生成请求ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// 缓存中间件（简单实现）
export function createCacheMiddleware(ttlSeconds: number = 300) {
  const cache = new Map<string, { data: any; expires: number }>()
  
  return async (c: Context, next: Next) => {
    // 只缓存GET请求
    if (c.req.method !== 'GET') {
      await next()
      return
    }
    
    const cacheKey = `${c.req.method}:${c.req.path}:${c.req.query()}`
    const now = Date.now()
    
    // 检查缓存
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > now) {
      console.log(`Cache hit: ${cacheKey}`)
      c.header('X-Cache', 'HIT')
      return c.json(cached.data)
    }
    
    // 执行请求
    await next()
    
    // 缓存响应（仅缓存成功响应）
    if (c.res?.status === 200) {
      try {
        const responseData = await c.res.clone().json()
        cache.set(cacheKey, {
          data: responseData,
          expires: now + (ttlSeconds * 1000)
        })
        c.header('X-Cache', 'MISS')
        console.log(`Cached: ${cacheKey}`)
      } catch (error) {
        // 非JSON响应，不缓存
        console.log(`Not cached (non-JSON): ${cacheKey}`)
      }
    }
    
    // 清理过期缓存
    if (Math.random() < 0.1) { // 10%概率清理
      cleanupExpiredCache(cache)
    }
  }
}

// 清理过期缓存
function cleanupExpiredCache(cache: Map<string, { data: any; expires: number }>) {
  const now = Date.now()
  let cleanedCount = 0
  
  for (const [key, value] of cache.entries()) {
    if (value.expires <= now) {
      cache.delete(key)
      cleanedCount++
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned ${cleanedCount} expired cache entries`)
  }
}

// Rate limiting中间件
export function createRateLimitMiddleware(requestsPerMinute: number = 60) {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return async (c: Context, next: Next) => {
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown'
    
    const now = Date.now()
    const windowStart = Math.floor(now / 60000) * 60000 // 1分钟窗口
    const resetTime = windowStart + 60000
    
    const userRequests = requests.get(clientIP)
    
    if (!userRequests || userRequests.resetTime <= now) {
      // 新的时间窗口
      requests.set(clientIP, { count: 1, resetTime })
    } else if (userRequests.count >= requestsPerMinute) {
      // 超出限制
      c.header('X-RateLimit-Limit', requestsPerMinute.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
      
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求频率过高，请稍后再试',
          details: {
            limit: requestsPerMinute,
            resetAt: new Date(resetTime).toISOString()
          }
        },
        timestamp: new Date().toISOString()
      }, 429)
    } else {
      // 增加计数
      userRequests.count++
      requests.set(clientIP, userRequests)
    }
    
    // 添加限流头
    c.header('X-RateLimit-Limit', requestsPerMinute.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, requestsPerMinute - (userRequests?.count || 0)).toString())
    c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
    
    await next()
    
    // 定期清理过期记录
    if (Math.random() < 0.05) { // 5%概率清理
      cleanupExpiredRateLimit(requests)
    }
  }
}

// 清理过期的限流记录
function cleanupExpiredRateLimit(requests: Map<string, { count: number; resetTime: number }>) {
  const now = Date.now()
  let cleanedCount = 0
  
  for (const [key, value] of requests.entries()) {
    if (value.resetTime <= now) {
      requests.delete(key)
      cleanedCount++
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned ${cleanedCount} expired rate limit entries`)
  }
}

// 压缩中间件（基础实现）
export async function compressionMiddleware(c: Context, next: Next) {
  await next()
  
  const acceptEncoding = c.req.header('Accept-Encoding') || ''
  const contentType = c.res?.headers.get('Content-Type') || ''
  
  // 检查是否支持gzip且内容类型适合压缩
  if (acceptEncoding.includes('gzip') && 
      (contentType.includes('application/json') || 
       contentType.includes('text/') ||
       contentType.includes('application/javascript'))) {
    
    try {
      const response = c.res
      if (response && response.body) {
        // 注意：在Cloudflare Workers中，压缩通常由边缘自动处理
        // 这里主要是设置相应的头部
        c.header('Content-Encoding', 'gzip')
        c.header('Vary', 'Accept-Encoding')
      }
    } catch (error) {
      console.warn('Compression failed:', error)
    }
  }
} 