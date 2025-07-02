// 分页计算工具
export interface PaginationOptions {
  page: number
  limit: number
  total: number
}

export interface PaginationResult {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
  offset: number
}

export function calculatePagination(options: PaginationOptions): PaginationResult {
  const { page, limit, total } = options
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    offset,
  }
}

// 验证分页参数
export function validatePaginationParams(page?: string, limit?: string) {
  const parsedPage = page ? parseInt(page, 10) : 1
  const parsedLimit = limit ? parseInt(limit, 10) : 20

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new Error('页码必须是大于0的整数')
  }

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new Error('每页数量必须是1-100之间的整数')
  }

  return { page: parsedPage, limit: parsedLimit }
} 