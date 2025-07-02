import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { CreateDocumentSchema } from '../../types/document'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const create = new Hono<{ Bindings: WorkerEnv }>()

// POST /api/documents - 创建新文档
create.post('/', async (c) => {
  // 手动验证JSON数据
  let input
  try {
    const body = await c.req.json()
    input = CreateDocumentSchema.parse(body)
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
  const document = await documentService.createDocument(user.id, input)
  
  return c.json(createSuccessResponse(document), 201 as any)
})

export default create 