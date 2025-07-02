import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { PatchDocumentSchema } from '../../types/document'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const autosave = new Hono<{ Bindings: WorkerEnv }>()

// PATCH /api/documents/:id/autosave - 自动保存专用接口
autosave.patch('/:id/autosave', async (c) => {
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
  
  // 自动保存时不增加版本号，只更新内容和位置
  const document = await documentService.patchDocument(user.id, documentId, input)
  
  return c.json(createSuccessResponse({
    ...document,
    autoSaved: true,
    savedAt: new Date().toISOString(),
  }))
})

// POST /api/documents/:id/save - 手动保存接口
autosave.post('/:id/save', async (c) => {
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
  
  // 手动保存时增加版本号
  const updateData = {
    ...input,
    version: { increment: 1 } // 手动保存时增加版本号
  }
  
  const document = await documentService.updateDocument(user.id, documentId, updateData)
  
  return c.json(createSuccessResponse({
    ...document,
    manuallySaved: true,
    savedAt: new Date().toISOString(),
  }))
})

export default autosave 