import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ApiError, createErrorResponse, ApiErrorCodes } from '../types/api'

// 错误处理中间件
export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (error) {
    console.error('API Error:', error)
    
    // 处理ApiError
    if (error instanceof ApiError) {
      return c.json(
        createErrorResponse(error.code, error.message, error.details),
        error.statusCode as any
      )
    }
    
    // 处理Hono HTTPException
    if (error instanceof HTTPException) {
      return c.json(
        createErrorResponse(
          ApiErrorCodes.VALIDATION_ERROR,
          error.message,
          { statusCode: error.status }
        ),
        error.status
      )
    }
    
    // 处理Zod验证错误
    if (error && typeof error === 'object' && 'issues' in error) {
      return c.json(
        createErrorResponse(
          ApiErrorCodes.VALIDATION_ERROR,
          '数据验证失败',
          error
        ),
        400
      )
    }
    
    // 处理其他未知错误
    return c.json(
      createErrorResponse(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '服务器内部错误',
        globalThis.process?.env?.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      ),
      500
    )
  }
}

// 404处理中间件
export function notFoundHandler(c: Context) {
  return c.json(
    createErrorResponse(
      ApiErrorCodes.NOT_FOUND,
      '请求的资源不存在',
      { path: c.req.path, method: c.req.method }
    ),
    404
  )
} 