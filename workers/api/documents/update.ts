import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { UpdateDocumentSchema, PatchDocumentSchema } from '../../types/document'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const update = new Hono<{ Bindings: WorkerEnv }>()

// PUT /api/documents/:id - 完整更新文档
update.put('/:id', async (c) => {
  const documentId = c.req.param('id')
  
  if (!documentId) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '文档ID不能为空',
      undefined,
      400
    )
  }

  // 验证请求体
  let input
  try {
    const body = await c.req.json()
    input = UpdateDocumentSchema.parse(body)
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '请求数据格式错误',
      error,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  const document = await documentService.updateDocument(user.id, documentId, input)
  
  return c.json(createSuccessResponse(document))
})

// PATCH /api/documents/:id - 部分更新文档
update.patch('/:id', async (c) => {
  const documentId = c.req.param('id')
  
  if (!documentId) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '文档ID不能为空',
      undefined,
      400
    )
  }

  // 验证请求体
  let input
  try {
    const body = await c.req.json()
    input = PatchDocumentSchema.parse(body)
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '请求数据格式错误',
      error,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  const document = await documentService.patchDocument(user.id, documentId, input)
  
  return c.json(createSuccessResponse(document))
})

export default update 