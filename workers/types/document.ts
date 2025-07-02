import { z } from 'zod'

// 基础文档Schema
export const DocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1, '标题不能为空').max(200, '标题长度不能超过200字符'),
  content: z.string().default(''),
  userId: z.string().cuid(),
  tags: z.string().default('[]'), // JSON string array
  wordCount: z.number().int().min(0).default(0),
  readingTime: z.number().int().min(0).default(0),
  lastEditPosition: z.number().int().min(0).default(0),
  version: z.number().int().min(1).default(1),
  isDeleted: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// 创建文档请求Schema
export const CreateDocumentSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题长度不能超过200字符'),
  content: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
})

// 更新文档请求Schema  
export const UpdateDocumentSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题长度不能超过200字符').optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lastEditPosition: z.number().int().min(0).optional(),
})

// 部分更新文档Schema（用于自动保存）
export const PatchDocumentSchema = z.object({
  content: z.string().optional(),
  lastEditPosition: z.number().int().min(0).optional(),
})

// 文档查询参数Schema
export const DocumentQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)),
  limit: z.string().optional().default('20').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)),
  search: z.string().optional(),
  tags: z.string().optional(), // 逗号分隔的标签
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'wordCount']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// TypeScript类型定义
export type Document = z.infer<typeof DocumentSchema>
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>
export type PatchDocumentInput = z.infer<typeof PatchDocumentSchema>
export type DocumentQuery = z.infer<typeof DocumentQuerySchema>

// 文档响应类型
export interface DocumentResponse {
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

// 文档列表响应类型
export interface DocumentListResponse {
  documents: Omit<DocumentResponse, 'content'>[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 文档统计信息
export interface DocumentStats {
  wordCount: number
  readingTime: number
  characterCount: number
  paragraphCount: number
  lastModified: string
} 