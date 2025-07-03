import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ApiError, ApiErrorCodes, createErrorResponse } from '../types/api'

// 错误处理中间件
export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (error) {
    console.error('API Error:', error)
    
    // 处理ApiError
    if (error instanceof ApiError) {
      console.error(`ApiError: ${error.code} - ${error.message}`, error.details)
      return c.json(
        createErrorResponse(error.code, error.message, error.details),
        error.statusCode as any
      )
    }
    
    // 处理Hono HTTPException
    if (error instanceof HTTPException) {
      console.error(`HTTPException: ${error.status} - ${error.message}`)
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
      console.error('Zod validation error:', error)
      return c.json(
        createErrorResponse(
          ApiErrorCodes.VALIDATION_ERROR,
          '数据验证失败',
          error
        ),
        400
      )
    }
    
    // 处理Prisma错误
    if (
      error && 
      typeof error === 'object' && 
      'code' in error && 
      'clientVersion' in error &&
      typeof error.code === 'string'
    ) {
      console.error('Prisma error:', error)
      const prismaError = error as { code: string; message?: string }
      return c.json(
        createErrorResponse(
          ApiErrorCodes.INTERNAL_SERVER_ERROR,
          '数据库操作失败',
          {
            code: prismaError.code,
            message: prismaError.message || '未知数据库错误'
          }
        ),
        500
      )
    }
    
    // 处理其他未知错误
    console.error('Unhandled error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isDev = import.meta.env?.DEV
    
    return c.json(
      createErrorResponse(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '服务器内部错误',
        isDev ? errorMessage : undefined
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