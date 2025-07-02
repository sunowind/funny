import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { DocumentQuerySchema } from '../../types/document'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const list = new Hono<{ Bindings: WorkerEnv }>()

// GET /api/documents - 获取文档列表
list.get('/', async (c) => {
  // 验证查询参数
  let query
  try {
    const queryParams = c.req.query()
    query = DocumentQuerySchema.parse(queryParams)
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '查询参数格式错误',
      error,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  const result = await documentService.getDocuments(user.id, query)
  
  return c.json(createSuccessResponse(result))
})

export default list 