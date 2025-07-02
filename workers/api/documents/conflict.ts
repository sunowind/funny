import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'
import { detectVersionConflict, detectContentConflict, autoResolveConflict, createConflictMarkers } from '../../utils/conflictResolver'

const conflict = new Hono<{ Bindings: WorkerEnv }>()

// GET /api/documents/:id/conflict-check - 检查冲突
conflict.get('/:id/conflict-check', async (c) => {
  const documentId = c.req.param('id')
  const clientVersion = parseInt(c.req.query('version') || '0')
  
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
  
  try {
    const document = await documentService.getDocument(user.id, documentId)
    
    const conflictInfo = detectVersionConflict(
      clientVersion,
      document.version,
      document.updatedAt
    )
    
    return c.json(createSuccessResponse({
      hasConflict: conflictInfo.hasConflict,
      conflictType: conflictInfo.conflictType,
      localVersion: conflictInfo.localVersion,
      serverVersion: conflictInfo.serverVersion,
      lastModified: conflictInfo.lastModified,
      serverContent: conflictInfo.hasConflict ? document.content : undefined,
    }))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '检查冲突失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

// POST /api/documents/:id/resolve-conflict - 解决冲突
conflict.post('/:id/resolve-conflict', async (c) => {
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

  const { 
    localContent, 
    clientVersion, 
    resolutionStrategy = 'latest_wins' 
  } = body

  if (!localContent || typeof clientVersion !== 'number') {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '缺少必要参数：localContent 和 clientVersion',
      undefined,
      400
    )
  }

  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  
  try {
    // 获取当前服务器版本
    const serverDocument = await documentService.getDocument(user.id, documentId)
    
    // 检查是否存在冲突
    const versionConflict = detectVersionConflict(
      clientVersion,
      serverDocument.version,
      serverDocument.updatedAt
    )
    
    const contentConflict = detectContentConflict(
      localContent,
      serverDocument.content
    )
    
    if (!versionConflict.hasConflict && !contentConflict.hasConflict) {
      return c.json(createSuccessResponse({
        resolved: true,
        strategy: 'no_conflict',
        content: localContent,
        message: '没有检测到冲突',
      }))
    }
    
    // 自动解决冲突
    let resolution
    switch (resolutionStrategy) {
      case 'keep_local':
        resolution = {
          strategy: 'keep_local' as const,
          resolvedContent: localContent,
        }
        break
        
      case 'keep_server':
        resolution = {
          strategy: 'keep_server' as const,
          resolvedContent: serverDocument.content,
        }
        break
        
      case 'create_markers':
        resolution = {
          strategy: 'create_backup' as const,
          resolvedContent: createConflictMarkers(
            localContent,
            serverDocument.content,
            versionConflict
          ),
        }
        break
        
      default:
        resolution = autoResolveConflict(
          localContent,
          serverDocument.content,
          'latest_wins'
        )
    }
    
    // 应用解决方案
    const updatedDocument = await documentService.updateDocument(
      user.id,
      documentId,
      {
        content: resolution.resolvedContent,
      }
    )
    
    return c.json(createSuccessResponse({
      resolved: true,
      strategy: resolution.strategy,
      content: resolution.resolvedContent,
      document: updatedDocument,
      message: '冲突已解决',
    }))
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '解决冲突失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

// GET /api/documents/:id/versions - 获取文档版本历史
conflict.get('/:id/versions', async (c) => {
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
  
  // 这里应该从版本历史表中获取数据
  // 目前简化为返回当前版本信息
  const documentService = new DocumentService(c.env.DB)
  
  try {
    const document = await documentService.getDocument(user.id, documentId)
    
    const versions = [
      {
        version: document.version,
        content: document.content,
        createdAt: document.updatedAt,
        type: 'current',
      }
    ]
    
    return c.json(createSuccessResponse({
      versions,
      currentVersion: document.version,
      totalVersions: versions.length,
    }))
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '获取版本历史失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

export default conflict 