import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ApiError, ApiErrorCodes } from '../types/api'
import type {
    CreateDocumentInput,
    DocumentListResponse,
    DocumentQuery,
    DocumentResponse,
    DocumentStats,
    PatchDocumentInput,
    UpdateDocumentInput
} from '../types/document'

export class DocumentService {
  private prisma: PrismaClient

  constructor(db: D1Database) {
    try {
      if (!db) {
        console.error('DocumentService: D1 database instance is undefined')
        throw new ApiError(
          ApiErrorCodes.INTERNAL_SERVER_ERROR,
          '数据库连接未配置',
          'D1 database instance is undefined'
        )
      }
      
      const adapter = new PrismaD1(db)
      this.prisma = new PrismaClient({ adapter })
      console.log('DocumentService: Prisma client initialized successfully')
    } catch (error) {
      console.error('DocumentService: Failed to initialize Prisma client:', error)
      throw new ApiError(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '数据库连接失败',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  // 创建文档
  async createDocument(userId: string, input: CreateDocumentInput): Promise<DocumentResponse> {
    try {
      const tagsJson = JSON.stringify(input.tags || [])
      const wordCount = this.calculateWordCount(input.content || '')
      const readingTime = this.calculateReadingTime(wordCount)

      const document = await this.prisma.document.create({
        data: {
          title: input.title,
          content: input.content || '',
          userId,
          tags: tagsJson,
          wordCount,
          readingTime,
          version: 1,
        },
      })

      return this.formatDocumentResponse(document)
    } catch (error) {
      console.error('创建文档失败:', error)
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_CREATION_FAILED,
        '创建文档失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 获取文档列表
  async getDocuments(userId: string, query: DocumentQuery): Promise<DocumentListResponse> {
    try {
      const { page, limit, search, tags, sortBy, sortOrder } = query
      const skip = (page - 1) * limit

      // 构建查询条件
      const where: any = {
        userId,
        isDeleted: false,
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
        if (tagArray.length > 0) {
          where.tags = {
            contains: tagArray[0] // 简单实现，仅支持单标签搜索
          }
        }
      }

      console.log('DocumentService: Fetching documents with query:', JSON.stringify(query))
      console.log('DocumentService: Where clause:', JSON.stringify(where))

      // 查询文档和总数
      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where,
          select: {
            id: true,
            title: true,
            tags: true,
            wordCount: true,
            readingTime: true,
            lastEditPosition: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where }),
      ])

      console.log(`DocumentService: Found ${documents.length} documents out of ${total} total`)

      return {
        documents: documents.map(doc => ({
          ...doc,
          tags: this.parseTags(doc.tags),
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      console.error('获取文档列表失败:', error)
      throw new ApiError(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '获取文档列表失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 获取文档详情
  async getDocument(userId: string, documentId: string): Promise<DocumentResponse> {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: documentId,
          userId,
          isDeleted: false,
        },
      })

      if (!document) {
        throw new ApiError(
          ApiErrorCodes.DOCUMENT_NOT_FOUND,
          '文档不存在',
          undefined,
          404
        )
      }

      return this.formatDocumentResponse(document)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('获取文档失败:', error)
      throw new ApiError(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '获取文档失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 更新文档
  async updateDocument(
    userId: string, 
    documentId: string, 
    input: UpdateDocumentInput
  ): Promise<DocumentResponse> {
    try {
      // 验证文档存在和权限
      await this.verifyDocumentAccess(userId, documentId)

      const updateData: any = {}
      
      if (input.title !== undefined) {
        updateData.title = input.title
      }
      
      if (input.content !== undefined) {
        updateData.content = input.content
        updateData.wordCount = this.calculateWordCount(input.content)
        updateData.readingTime = this.calculateReadingTime(updateData.wordCount)
      }
      
      if (input.tags !== undefined) {
        updateData.tags = JSON.stringify(input.tags)
      }
      
      if (input.lastEditPosition !== undefined) {
        updateData.lastEditPosition = input.lastEditPosition
      }

      // 更新版本号
      updateData.version = { increment: 1 }

      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: updateData,
      })

      return this.formatDocumentResponse(document)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('更新文档失败:', error)
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_UPDATE_FAILED,
        '更新文档失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 部分更新文档（用于自动保存）
  async patchDocument(
    userId: string, 
    documentId: string, 
    input: PatchDocumentInput
  ): Promise<DocumentResponse> {
    try {
      await this.verifyDocumentAccess(userId, documentId)

      const updateData: any = {}
      
      if (input.content !== undefined) {
        updateData.content = input.content
        updateData.wordCount = this.calculateWordCount(input.content)
        updateData.readingTime = this.calculateReadingTime(updateData.wordCount)
      }
      
      if (input.lastEditPosition !== undefined) {
        updateData.lastEditPosition = input.lastEditPosition
      }

      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: updateData,
      })

      return this.formatDocumentResponse(document)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('自动保存失败:', error)
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_UPDATE_FAILED,
        '自动保存失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 删除文档（软删除）
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      await this.verifyDocumentAccess(userId, documentId)

      await this.prisma.document.update({
        where: { id: documentId },
        data: { isDeleted: true },
      })
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('删除文档失败:', error)
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_DELETE_FAILED,
        '删除文档失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 获取文档统计信息
  async getDocumentStats(userId: string, documentId: string): Promise<DocumentStats> {
    try {
      const document = await this.getDocument(userId, documentId)
      
      return {
        wordCount: document.wordCount,
        readingTime: document.readingTime,
        characterCount: document.content.length,
        paragraphCount: document.content.split('\n\n').filter(p => p.trim()).length,
        lastModified: document.updatedAt,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      throw new ApiError(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        '获取文档统计失败',
        error instanceof Error ? error.message : undefined
      )
    }
  }

  // 私有方法：验证文档访问权限
  private async verifyDocumentAccess(userId: string, documentId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        isDeleted: false,
      },
      select: { userId: true },
    })

    if (!document) {
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_NOT_FOUND,
        '文档不存在',
        undefined,
        404
      )
    }

    if (document.userId !== userId) {
      throw new ApiError(
        ApiErrorCodes.DOCUMENT_ACCESS_DENIED,
        '无权访问此文档',
        undefined,
        403
      )
    }
  }

  // 私有方法：格式化文档响应
  private formatDocumentResponse(document: any): DocumentResponse {
    return {
      id: document.id,
      title: document.title,
      content: document.content,
      tags: this.parseTags(document.tags),
      wordCount: document.wordCount,
      readingTime: document.readingTime,
      lastEditPosition: document.lastEditPosition,
      version: document.version,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    }
  }

  // 私有方法：解析标签
  private parseTags(tagsJson: string): string[] {
    try {
      return JSON.parse(tagsJson || '[]')
    } catch {
      return []
    }
  }

  // 私有方法：计算字数
  private calculateWordCount(content: string): number {
    if (!content) return 0
    
    // 移除Markdown语法，计算实际文字数量
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // 移除代码块
      .replace(/`[^`]*`/g, '') // 移除行内代码
      .replace(/#{1,6}\s/g, '') // 移除标题标记
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 移除图片，保留alt文本
    
    // 中英文混合字数统计
    const chineseChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (cleanContent.match(/[a-zA-Z]+/g) || []).length
    
    return chineseChars + englishWords
  }

  // 私有方法：计算阅读时间（分钟）
  private calculateReadingTime(wordCount: number): number {
    // 中文阅读速度约300字/分钟，英文约250词/分钟
    // 这里简化为平均275字符/分钟
    return Math.ceil(wordCount / 275)
  }
} 