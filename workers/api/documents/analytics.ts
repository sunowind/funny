import { Hono } from 'hono'
import type { WorkerEnv } from '../../types/api'
import { DocumentService } from '../../services/documentService'
import { createSuccessResponse, ApiError, ApiErrorCodes } from '../../types/api'
import { getCurrentUser } from '../../middleware/auth'

const analytics = new Hono<{ Bindings: WorkerEnv }>()

// GET /api/documents/analytics/overview - 获取用户文档总览统计
analytics.get('/analytics/overview', async (c) => {
  const user = getCurrentUser(c)
  const documentService = new DocumentService(c.env.DB)
  
  try {
    // 获取用户所有文档的统计信息
    const documents = await documentService.getDocuments(user.id, {
      page: 1,
      limit: 1000, // 获取所有文档用于统计
      search: '',
      tags: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    
    const totalDocuments = documents.pagination.total
    const totalWords = documents.documents.reduce((sum, doc) => sum + doc.wordCount, 0)
    const totalReadingTime = documents.documents.reduce((sum, doc) => sum + doc.readingTime, 0)
    
    // 计算最近活跃文档（最近7天有更新的）
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentlyActive = documents.documents.filter(doc => 
      new Date(doc.updatedAt) > oneWeekAgo
    ).length
    
    // 按标签分组统计
    const tagStats = new Map<string, number>()
    documents.documents.forEach(doc => {
      doc.tags.forEach(tag => {
        tagStats.set(tag, (tagStats.get(tag) || 0) + 1)
      })
    })
    
    const topTags = Array.from(tagStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))
    
    // 按月份统计文档创建量
    const monthlyStats = new Map<string, number>()
    documents.documents.forEach(doc => {
      const month = new Date(doc.createdAt).toISOString().substring(0, 7) // YYYY-MM
      monthlyStats.set(month, (monthlyStats.get(month) || 0) + 1)
    })
    
    const monthlyCreation = Array.from(monthlyStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }))
    
    return c.json(createSuccessResponse({
      overview: {
        totalDocuments,
        totalWords,
        totalReadingTime,
        recentlyActive,
        averageWordsPerDocument: totalDocuments > 0 ? Math.round(totalWords / totalDocuments) : 0,
      },
      topTags,
      monthlyCreation: monthlyCreation.slice(-12), // 最近12个月
      lastUpdated: new Date().toISOString(),
    }))
    
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '获取统计信息失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

// GET /api/documents/analytics/productivity - 获取生产力统计
analytics.get('/analytics/productivity', async (c) => {
  const user = getCurrentUser(c)
  const days = parseInt(c.req.query('days') || '30')
  
  if (days < 1 || days > 365) {
    throw new ApiError(
      ApiErrorCodes.VALIDATION_ERROR,
      '天数范围必须在1-365之间',
      undefined,
      400
    )
  }
  
  const documentService = new DocumentService(c.env.DB)
  
  try {
    const documents = await documentService.getDocuments(user.id, {
      page: 1,
      limit: 1000,
      search: '',
      tags: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    })
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // 按日期统计
    const dailyStats = new Map<string, {
      documentsCreated: number
      documentsUpdated: number
      wordsWritten: number
    }>()
    
    // 初始化日期
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      dailyStats.set(dateKey, {
        documentsCreated: 0,
        documentsUpdated: 0,
        wordsWritten: 0
      })
    }
    
    // 统计创建的文档
    documents.documents.forEach(doc => {
      const createdDate = new Date(doc.createdAt).toISOString().split('T')[0]
      const updatedDate = new Date(doc.updatedAt).toISOString().split('T')[0]
      
      if (new Date(doc.createdAt) >= startDate) {
        const stats = dailyStats.get(createdDate)
        if (stats) {
          stats.documentsCreated++
          stats.wordsWritten += doc.wordCount
        }
      } else if (new Date(doc.updatedAt) >= startDate) {
        const stats = dailyStats.get(updatedDate)
        if (stats) {
          stats.documentsUpdated++
        }
      }
    })
    
    const productivityData = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // 计算趋势
    const totalCreated = productivityData.reduce((sum, day) => sum + day.documentsCreated, 0)
    const totalUpdated = productivityData.reduce((sum, day) => sum + day.documentsUpdated, 0)
    const totalWords = productivityData.reduce((sum, day) => sum + day.wordsWritten, 0)
    
    const averageWordsPerDay = Math.round(totalWords / days)
    const averageDocumentsPerDay = Math.round((totalCreated + totalUpdated) / days * 10) / 10
    
    return c.json(createSuccessResponse({
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalCreated,
        totalUpdated,
        totalWords,
        averageWordsPerDay,
        averageDocumentsPerDay,
      },
      dailyData: productivityData,
    }))
    
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '获取生产力统计失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

// GET /api/documents/analytics/search-suggestions - 获取搜索建议
analytics.get('/analytics/search-suggestions', async (c) => {
  const user = getCurrentUser(c)
  const query = c.req.query('q') || ''
  
  if (query.length < 2) {
    return c.json(createSuccessResponse({
      suggestions: [],
      message: '搜索词长度至少2个字符'
    }))
  }
  
  const documentService = new DocumentService(c.env.DB)
  
  try {
    const documents = await documentService.getDocuments(user.id, {
      page: 1,
      limit: 100,
      search: query,
      tags: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    })
    
    // 收集标题建议
    const titleSuggestions = documents.documents
      .filter(doc => doc.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(doc => ({
        type: 'title',
        text: doc.title,
        documentId: doc.id
      }))
    
    // 收集标签建议
    const allTags = new Set<string>()
    documents.documents.forEach(doc => {
      doc.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          allTags.add(tag)
        }
      })
    })
    
    const tagSuggestions = Array.from(allTags)
      .slice(0, 5)
      .map(tag => ({
        type: 'tag',
        text: tag,
        documentId: null
      }))
    
    return c.json(createSuccessResponse({
      suggestions: [...titleSuggestions, ...tagSuggestions].slice(0, 10),
      totalResults: documents.pagination.total
    }))
    
  } catch (error) {
    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      '获取搜索建议失败',
      error instanceof Error ? error.message : undefined
    )
  }
})

export default analytics 