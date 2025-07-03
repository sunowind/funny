import { Hono } from 'hono'
import { getCurrentUser } from '../../middleware/auth'
import { DocumentService } from '../../services/documentService'
import type { WorkerEnv } from '../../types/api'
import { ApiError, ApiErrorCodes, createSuccessResponse } from '../../types/api'
import { DocumentQuerySchema } from '../../types/document'

const list = new Hono<{ Bindings: WorkerEnv }>()

// GET /api/documents - 获取文档列表
list.get('/', async (c) => {
  console.log('GET /api/documents - 开始处理请求')
  
  try {
    // 验证查询参数
    let query
    try {
      const queryParams = c.req.query()
      console.log('查询参数:', queryParams)
      query = DocumentQuerySchema.parse(queryParams)
      console.log('解析后的查询参数:', query)
    } catch (error) {
      console.error('查询参数验证失败:', error)
      throw new ApiError(
        ApiErrorCodes.VALIDATION_ERROR,
        '查询参数格式错误',
        error,
        400
      )
    }

    console.log('获取当前用户')
    const user = getCurrentUser(c)
    console.log('当前用户ID:', user.id)
    
    console.log('初始化DocumentService')
    const documentService = new DocumentService(c.env.DB)
    
    console.log('调用getDocuments方法')
    const result = await documentService.getDocuments(user.id, query)
    
    console.log('请求成功，返回结果')
    return c.json(createSuccessResponse(result))
  } catch (error) {
    console.error('处理请求时出错:', error)
    throw error
  }
})

export default list 