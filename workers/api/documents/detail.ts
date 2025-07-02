import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const detail = new Hono<{ Bindings: WorkerEnv }>()

// GET /api/documents/:id - 获取文档详情
detail.get('/:id', async (c) => {
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
  const document = await documentService.getDocument(user.id, documentId)
  
  return c.json(createSuccessResponse(document))
})

// GET /api/documents/:id/stats - 获取文档统计信息
detail.get('/:id/stats', async (c) => {
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
  const stats = await documentService.getDocumentStats(user.id, documentId)
  
  return c.json(createSuccessResponse(stats))
})

export default detail 