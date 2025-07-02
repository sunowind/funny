// 前端API类型定义，与后端保持一致

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

// 文档相关类型
export interface Document {
  id: string
  title: string
  content: string
  tags: string[]
  wordCount: number
  readingTime: number
  lastEditPosition: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface DocumentListItem extends Omit<Document, 'content'> {}

export interface DocumentListResponse {
  documents: DocumentListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DocumentStats {
  wordCount: number
  readingTime: number
  characterCount: number
  paragraphCount: number
  lastModified: string
}

// 请求类型
export interface CreateDocumentRequest {
  title: string
  content?: string
  tags?: string[]
}

export interface UpdateDocumentRequest {
  title?: string
  content?: string
  tags?: string[]
  lastEditPosition?: number
}

export interface PatchDocumentRequest {
  content?: string
  lastEditPosition?: number
}

export interface DocumentQuery {
  page?: number
  limit?: number
  search?: string
  tags?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'wordCount'
  sortOrder?: 'asc' | 'desc'
}

// 自动保存相关
export interface AutoSaveResponse extends Document {
  autoSaved: boolean
  savedAt: string
}

// 冲突解决相关
export interface ConflictInfo {
  hasConflict: boolean
  conflictType: 'version' | 'content' | 'none'
  localVersion: number
  serverVersion: number
  lastModified: string
  serverContent?: string
}

export interface ConflictResolution {
  resolved: boolean
  strategy: string
  content: string
  document?: Document
  message: string
}

// 统计分析相关
export interface DocumentOverview {
  overview: {
    totalDocuments: number
    totalWords: number
    totalReadingTime: number
    recentlyActive: number
    averageWordsPerDocument: number
  }
  topTags: Array<{ tag: string; count: number }>
  monthlyCreation: Array<{ month: string; count: number }>
  lastUpdated: string
}

export interface ProductivityStats {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  summary: {
    totalCreated: number
    totalUpdated: number
    totalWords: number
    averageWordsPerDay: number
    averageDocumentsPerDay: number
  }
  dailyData: Array<{
    date: string
    documentsCreated: number
    documentsUpdated: number
    wordsWritten: number
  }>
}

// API错误类型
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
} 