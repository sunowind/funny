// 内容差异计算和增量保存工具

export interface TextDiff {
  type: 'insert' | 'delete' | 'replace' | 'equal'
  position: number
  length?: number
  content: string
  oldContent?: string
}

export interface DiffResult {
  changes: TextDiff[]
  similarity: number // 0-1之间，表示相似度
  hasChanges: boolean
  changeCount: number
}

// 计算两个文本的差异
export function calculateDiff(oldText: string, newText: string): DiffResult {
  if (oldText === newText) {
    return {
      changes: [],
      similarity: 1,
      hasChanges: false,
      changeCount: 0,
    }
  }

  const changes: TextDiff[] = []
  
  // 简化的差异算法：按行比较
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  
  let oldIndex = 0
  let newIndex = 0
  let position = 0
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex] || ''
    const newLine = newLines[newIndex] || ''
    
    if (oldLine === newLine) {
      // 相同行，跳过
      position += oldLine.length + 1 // +1 for newline
      oldIndex++
      newIndex++
    } else if (oldIndex >= oldLines.length) {
      // 新增行
      changes.push({
        type: 'insert',
        position,
        content: newLine + '\n',
      })
      position += newLine.length + 1
      newIndex++
    } else if (newIndex >= newLines.length) {
      // 删除行
      changes.push({
        type: 'delete',
        position,
        length: oldLine.length + 1,
        content: '',
        oldContent: oldLine + '\n',
      })
      oldIndex++
    } else {
      // 替换行
      changes.push({
        type: 'replace',
        position,
        length: oldLine.length + 1,
        content: newLine + '\n',
        oldContent: oldLine + '\n',
      })
      position += newLine.length + 1
      oldIndex++
      newIndex++
    }
  }

  // 计算相似度
  const totalLines = Math.max(oldLines.length, newLines.length)
  const unchangedLines = totalLines - changes.length
  const similarity = totalLines > 0 ? unchangedLines / totalLines : 1

  return {
    changes,
    similarity,
    hasChanges: changes.length > 0,
    changeCount: changes.length,
  }
}

// 应用差异到文本
export function applyDiff(baseText: string, changes: TextDiff[]): string {
  if (changes.length === 0) {
    return baseText
  }

  let result = baseText
  let offset = 0

  // 按位置排序，确保正确应用
  const sortedChanges = [...changes].sort((a, b) => a.position - b.position)

  for (const change of sortedChanges) {
    const actualPosition = change.position + offset

    switch (change.type) {
      case 'insert':
        result = result.slice(0, actualPosition) + change.content + result.slice(actualPosition)
        offset += change.content.length
        break

      case 'delete':
        const deleteLength = change.length || 0
        result = result.slice(0, actualPosition) + result.slice(actualPosition + deleteLength)
        offset -= deleteLength
        break

      case 'replace':
        const replaceLength = change.length || 0
        result = result.slice(0, actualPosition) + change.content + result.slice(actualPosition + replaceLength)
        offset += change.content.length - replaceLength
        break
    }
  }

  return result
}

// 压缩差异数据（用于网络传输）
export function compressDiff(diff: DiffResult): string {
  const compressed = {
    c: diff.changes.map(change => ({
      t: change.type[0], // 只保留首字母
      p: change.position,
      l: change.length,
      c: change.content,
      o: change.oldContent,
    })),
    s: diff.similarity,
    h: diff.hasChanges,
    n: diff.changeCount,
  }

  return JSON.stringify(compressed)
}

// 解压差异数据
export function decompressDiff(compressedData: string): DiffResult {
  try {
    const compressed = JSON.parse(compressedData)
    
    const typeMap: Record<string, TextDiff['type']> = {
      i: 'insert',
      d: 'delete', 
      r: 'replace',
      e: 'equal',
    }

    return {
      changes: compressed.c.map((c: any) => ({
        type: typeMap[c.t] || 'equal',
        position: c.p,
        length: c.l,
        content: c.c,
        oldContent: c.o,
      })),
      similarity: compressed.s,
      hasChanges: compressed.h,
      changeCount: compressed.n,
    }
  } catch (error) {
    throw new Error('解压差异数据失败: ' + (error instanceof Error ? error.message : String(error)))
  }
}

// 检查变更是否显著（用于决定是否触发保存）
export function isSignificantChange(diff: DiffResult, threshold: number = 0.1): boolean {
  // 如果相似度低于阈值，认为是显著变更
  if (diff.similarity < (1 - threshold)) {
    return true
  }

  // 如果变更数量超过阈值，认为是显著变更  
  if (diff.changeCount > 5) {
    return true
  }

  // 检查是否有实质性内容变更（非空白字符）
  const hasContentChange = diff.changes.some(change => 
    change.type !== 'equal' && 
    change.content.trim().length > 0
  )

  return hasContentChange
}

// 合并多个差异
export function mergeDiffs(diffs: DiffResult[]): DiffResult {
  if (diffs.length === 0) {
    return {
      changes: [],
      similarity: 1,
      hasChanges: false,
      changeCount: 0,
    }
  }

  if (diffs.length === 1) {
    return diffs[0]
  }

  const allChanges: TextDiff[] = []
  let totalSimilarity = 0
  let totalChanges = 0

  for (const diff of diffs) {
    allChanges.push(...diff.changes)
    totalSimilarity += diff.similarity
    totalChanges += diff.changeCount
  }

  return {
    changes: allChanges,
    similarity: totalSimilarity / diffs.length,
    hasChanges: allChanges.length > 0,
    changeCount: totalChanges,
  }
}

// 创建增量保存数据
export interface IncrementalSave {
  documentId: string
  baseVersion: number
  diff: string // 压缩后的差异数据
  timestamp: string
  checksum: string // 用于验证数据完整性
}

export function createIncrementalSave(
  documentId: string,
  baseVersion: number,
  oldContent: string,
  newContent: string
): IncrementalSave {
  const diff = calculateDiff(oldContent, newContent)
  const compressedDiff = compressDiff(diff)
  
  // 创建简单的校验和
  const checksum = createChecksum(compressedDiff)

  return {
    documentId,
    baseVersion,
    diff: compressedDiff,
    timestamp: new Date().toISOString(),
    checksum,
  }
}

// 创建校验和
function createChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return hash.toString(16)
}

// 验证增量保存数据
export function validateIncrementalSave(save: IncrementalSave): boolean {
  try {
    const expectedChecksum = createChecksum(save.diff)
    if (expectedChecksum !== save.checksum) {
      return false
    }

    // 尝试解压差异数据
    decompressDiff(save.diff)
    return true
  } catch {
    return false
  }
} 