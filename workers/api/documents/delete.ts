import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const deleteRoute = new Hono<{ Bindings: WorkerEnv }>()

// DELETE /api/documents/:id - 删除文档（软删除）
deleteRoute.delete('/:id', async (c) => {
  const documentId = c.req.param('id')
  
  if (!documentId) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '文档ID不能为空',
      undefined,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  await documentService.deleteDocument(user.id, documentId)
  
  return c.json(createSuccessResponse({ 
    message: '文档删除成功',
    documentId 
  }))
})

// DELETE /api/documents - 批量删除文档
deleteRoute.delete('/', async (c) => {
  // 验证请求体
  let body
  try {
    body = await c.req.json()
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '请求数据格式错误',
      error,
      400
    )
  }

  if (!body.documentIds || !Array.isArray(body.documentIds)) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      'documentIds必须是数组',
      undefined,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  
  // 批量删除
  const results = []
  for (const documentId of body.documentIds) {
    try {
      await documentService.deleteDocument(user.id, documentId)
      results.push({ documentId, success: true })
    } catch (error) {
      results.push({ 
        documentId, 
        success: false, 
        error: error instanceof Error ? error.message : '删除失败' 
      })
    }
  }
  
  return c.json(createSuccessResponse({ 
    message: '批量删除完成',
    results 
  }))
})

export default deleteRoute 