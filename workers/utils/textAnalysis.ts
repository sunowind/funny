// 文本分析工具函数

// Markdown内容字数统计
export function analyzeMarkdownContent(content: string) {
  if (!content) {
    return {
      wordCount: 0,
      characterCount: 0,
      readingTime: 0,
      paragraphCount: 0,
    }
  }

  // 移除Markdown语法，计算实际文字数量
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]*`/g, '') // 移除行内代码
    .replace(/#{1,6}\s/g, '') // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 移除图片，保留alt文本
    .replace(/>\s*/g, '') // 移除引用标记
    .replace(/[-*+]\s/g, '') // 移除列表标记
    .replace(/\d+\.\s/g, '') // 移除有序列表标记

  // 中英文混合字数统计
  const chineseChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (cleanContent.match(/[a-zA-Z]+/g) || []).length
  const numbers = (cleanContent.match(/\d+/g) || []).length
  
  const wordCount = chineseChars + englishWords + numbers
  const characterCount = content.length

  // 计算阅读时间（分钟）
  // 中文阅读速度约300字/分钟，英文约250词/分钟
  // 这里简化为平均275字符/分钟
  const readingTime = Math.max(1, Math.ceil(wordCount / 275))

  // 计算段落数量
  const paragraphCount = content
    .split('\n\n')
    .filter(p => p.trim().length > 0).length

  return {
    wordCount,
    characterCount,
    readingTime,
    paragraphCount,
  }
}

// 提取Markdown标题
export function extractMarkdownHeadings(content: string) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    headings.push({
      level,
      text,
      anchor: text.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, '').replace(/\s+/g, '-')
    })
  }

  return headings
}

// 生成文档摘要
export function generateSummary(content: string, maxLength: number = 200): string {
  if (!content) return ''

  // 移除Markdown语法
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]*`/g, '') // 移除行内代码
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 移除图片
    .replace(/>\s*/g, '') // 移除引用标记
    .replace(/[-*+]\s/g, '') // 移除列表标记
    .replace(/\d+\.\s/g, '') // 移除有序列表标记
    .replace(/\n+/g, ' ') // 将换行替换为空格
    .trim()

  if (cleanContent.length <= maxLength) {
    return cleanContent
  }

  // 在单词边界截断
  const truncated = cleanContent.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

// 搜索文档内容
export function searchInContent(content: string, searchTerm: string): boolean {
  if (!content || !searchTerm) return false
  
  const normalizedContent = content.toLowerCase()
  const normalizedSearch = searchTerm.toLowerCase()
  
  return normalizedContent.includes(normalizedSearch)
}

// 验证Markdown语法（基础检查）
export function validateMarkdownSyntax(content: string) {
  const issues = []

  // 检查未闭合的代码块
  const codeBlockMatches = content.match(/```/g)
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    issues.push('存在未闭合的代码块')
  }

  // 检查未闭合的行内代码
  const inlineCodeMatches = content.match(/[^\\]`/g)
  if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
    issues.push('存在未闭合的行内代码')
  }

  // 检查链接格式
  const invalidLinks = content.match(/\[[^\]]*\]\([^)]*$/g)
  if (invalidLinks && invalidLinks.length > 0) {
    issues.push('存在格式错误的链接')
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
} 