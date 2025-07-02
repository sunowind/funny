// 文档冲突检测和解决工具

export interface ConflictInfo {
  hasConflict: boolean
  localVersion: number
  serverVersion: number
  conflictType: 'version' | 'content' | 'none'
  lastModified: string
}

export interface ConflictResolution {
  strategy: 'keep_local' | 'keep_server' | 'merge' | 'create_backup'
  resolvedContent: string
  backupCreated?: boolean
  backupId?: string
}

// 检测版本冲突
export function detectVersionConflict(
  clientVersion: number,
  serverVersion: number,
  lastModified: string
): ConflictInfo {
  const hasVersionConflict = clientVersion < serverVersion
  
  return {
    hasConflict: hasVersionConflict,
    localVersion: clientVersion,
    serverVersion: serverVersion,
    conflictType: hasVersionConflict ? 'version' : 'none',
    lastModified,
  }
}

// 检测内容冲突
export function detectContentConflict(
  localContent: string,
  serverContent: string,
  baseContent?: string
): ConflictInfo {
  // 简单的内容冲突检测
  const hasContentConflict = localContent !== serverContent
  
  if (!hasContentConflict) {
    return {
      hasConflict: false,
      localVersion: 0,
      serverVersion: 0,
      conflictType: 'none',
      lastModified: new Date().toISOString(),
    }
  }

  // 如果有基准内容，进行三方比较
  if (baseContent) {
    const localChanged = localContent !== baseContent
    const serverChanged = serverContent !== baseContent
    
    if (localChanged && serverChanged) {
      return {
        hasConflict: true,
        localVersion: 0,
        serverVersion: 0,
        conflictType: 'content',
        lastModified: new Date().toISOString(),
      }
    }
  }

  return {
    hasConflict: hasContentConflict,
    localVersion: 0,
    serverVersion: 0,
    conflictType: 'content',
    lastModified: new Date().toISOString(),
  }
}

// 自动解决冲突（简单策略）
export function autoResolveConflict(
  localContent: string,
  serverContent: string,
  strategy: 'latest_wins' | 'merge_attempt' | 'keep_both' = 'latest_wins'
): ConflictResolution {
  switch (strategy) {
    case 'latest_wins':
      return {
        strategy: 'keep_server',
        resolvedContent: serverContent,
      }
    
    case 'merge_attempt':
      // 简单的合并尝试：保留较长的内容
      const mergedContent = localContent.length > serverContent.length 
        ? localContent 
        : serverContent
      
      return {
        strategy: 'merge',
        resolvedContent: mergedContent,
      }
    
    case 'keep_both':
      // 创建包含两个版本的内容
      const bothVersions = `# 冲突内容 - 需要手动合并

## 本地版本
${localContent}

## 服务器版本  
${serverContent}

---
请手动合并上述内容并删除此说明。
`
      return {
        strategy: 'create_backup',
        resolvedContent: bothVersions,
        backupCreated: true,
      }
    
    default:
      return {
        strategy: 'keep_server',
        resolvedContent: serverContent,
      }
  }
}

// 创建冲突标记内容
export function createConflictMarkers(
  localContent: string,
  serverContent: string,
  conflictInfo: ConflictInfo
): string {
  return `<<<<<<< 本地更改 (版本 ${conflictInfo.localVersion})
${localContent}
=======
${serverContent}
>>>>>>> 服务器更改 (版本 ${conflictInfo.serverVersion})

<!-- 冲突信息:
- 冲突类型: ${conflictInfo.conflictType}
- 最后修改: ${conflictInfo.lastModified}
- 请手动解决冲突后删除这些标记
-->`
}

// 检查是否存在未解决的冲突标记
export function hasUnresolvedConflicts(content: string): boolean {
  const conflictMarkers = [
    '<<<<<<<',
    '=======', 
    '>>>>>>>',
  ]
  
  return conflictMarkers.some(marker => content.includes(marker))
}

// 清理冲突标记
export function cleanupConflictMarkers(content: string): string {
  // 移除Git风格的冲突标记
  return content
    .replace(/<<<<<<< .*?\n/g, '')
    .replace(/=======\n/g, '')
    .replace(/>>>>>>> .*?\n/g, '')
    .replace(/<!-- 冲突信息:[\s\S]*?-->/g, '')
    .trim()
}

// 生成文档快照用于冲突恢复
export interface DocumentSnapshot {
  id: string
  documentId: string
  content: string
  version: number
  createdAt: string
  reason: 'auto_save' | 'manual_save' | 'conflict_backup'
}

export function createDocumentSnapshot(
  documentId: string,
  content: string,
  version: number,
  reason: DocumentSnapshot['reason'] = 'auto_save'
): DocumentSnapshot {
  return {
    id: `snapshot_${documentId}_${Date.now()}`,
    documentId,
    content,
    version,
    createdAt: new Date().toISOString(),
    reason,
  }
} 