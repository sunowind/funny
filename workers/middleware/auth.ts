import type { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { ApiError, ApiErrorCodes, type WorkerEnv } from '../types/api'

// JWT payload类型
interface CustomJWTPayload {
  userId: string
  email: string
  exp: number
}

// 用户信息类型
interface UserInfo {
  id: string
  email: string
}

// 认证中间件
export async function authMiddleware(c: Context<{ Bindings: WorkerEnv }>, next: Next) {
  const authorization = c.req.header('Authorization')
  
  if (!authorization) {
    throw new ApiError(
      ApiErrorCodes.UNAUTHORIZED,
      '缺少认证信息',
      undefined,
      401
    )
  }

  if (!authorization.startsWith('Bearer ')) {
    throw new ApiError(
      ApiErrorCodes.UNAUTHORIZED,
      '认证格式错误',
      undefined,
      401
    )
  }

  const token = authorization.slice(7) // 移除 "Bearer " 前缀

  try {
    const payload = await verify(token, c.env.JWT_SECRET) as unknown as CustomJWTPayload
    
    // 检查token是否过期
    if (payload.exp < Date.now() / 1000) {
      throw new ApiError(
        ApiErrorCodes.UNAUTHORIZED,
        'Token已过期',
        undefined,
        401
      )
    }

    // 将用户信息添加到context
    c.set('user', {
      id: payload.userId,
      email: payload.email,
    } as UserInfo)

    await next()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(
      ApiErrorCodes.UNAUTHORIZED,
      '无效的认证令牌',
      error instanceof Error ? error.message : undefined,
      401
    )
  }
}

// 可选认证中间件（允许匿名访问，但如果有token则验证）
export async function optionalAuthMiddleware(c: Context<{ Bindings: WorkerEnv }>, next: Next) {
  const authorization = c.req.header('Authorization')
  
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7)
    
    try {
      const payload = await verify(token, c.env.JWT_SECRET) as unknown as CustomJWTPayload
      
      if (payload.exp >= Date.now() / 1000) {
        c.set('user', {
          id: payload.userId,
          email: payload.email,
        } as UserInfo)
      }
    } catch (error) {
      // 可选认证失败时不抛出错误，继续处理
      console.warn('Optional auth failed:', error)
    }
  }

  await next()
}

// 获取当前用户信息的辅助函数
export function getCurrentUser(c: Context): UserInfo {
  const user = c.get('user') as UserInfo | undefined
  
  if (!user) {
    throw new ApiError(
      ApiErrorCodes.UNAUTHORIZED,
      '用户未登录',
      undefined,
      401
    )
  }
  
  return user
} 