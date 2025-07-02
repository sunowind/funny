import { useCallback, useState } from 'react';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { SplitView } from '../components/editor/SplitView';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import type { ViewMode } from '../types/editor';

// 状态栏组件
function StatusBar({
    isDirty,
    isLoading,
    error,
    cursorPosition,
    documentStats
}: {
    isDirty: boolean;
    isLoading: boolean;
    error: string | null;
    cursorPosition: { line: number; column: number };
    documentStats: { wordCount: number; characterCount: number; readingTime: number };
}) {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
                <span>
                    行 {cursorPosition.line}, 列 {cursorPosition.column}
                </span>
                <span>
                    {documentStats.wordCount} 字 | {documentStats.characterCount} 字符
                </span>
                <span>
                    约 {documentStats.readingTime} 分钟阅读
                </span>
            </div>

            <div className="flex items-center space-x-2">
                {error && (
                    <span className="text-red-500">错误: {error}</span>
                )}
                {isLoading && (
                    <span className="text-blue-500">保存中...</span>
                )}
                {isDirty && !isLoading && (
                    <span className="text-orange-500">未保存</span>
                )}
                {!isDirty && !isLoading && (
                    <span className="text-green-500">已保存</span>
                )}
            </div>
        </div>
    );
}

// 编辑器主组件
function EditorInner() {
    console.log('Editor page loading...');
    const { user, logout } = useAuth();
    console.log('Current user in editor:', user);
    const [documentTitle, setDocumentTitle] = useState('无标题文档');

    // 模拟保存函数（后续连接到 API）
    const handleSave = useCallback(async (content: string) => {
        // 这里会连接到实际的保存 API
        console.log('Saving document:', { title: documentTitle, content });

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        return Promise.resolve();
    }, [documentTitle]);

    const {
        editorState,
        updateContent,
        handleSave: manualSave,
        setViewMode,
        updateCursorPosition,
        formatText,
        insertLink,
        insertImage,
        insertHeading,
        insertList,
        insertTable,
        insertCodeBlock,
        getDocumentStats,
    } = useMarkdownEditor({
        initialContent: `# 欢迎使用 Markdown 编辑器

## 功能特色

- **实时预览**: 左侧编辑，右侧即时预览
- **完整语法支持**: 支持所有标准 Markdown 语法
- **数学公式**: 使用 LaTeX 语法，如 $E=mc^2$
- **图表支持**: 支持 Mermaid 图表

## 快捷键

- \`Ctrl+B\`: **粗体**
- \`Ctrl+I\`: *斜体*
- \`Ctrl+K\`: [链接](http://example.com)
- \`Ctrl+\`\`: \`代码\`

## 示例表格

| 功能 | 状态 | 描述 |
|------|------|------|
| 编辑 | ✅ | 支持语法高亮 |
| 预览 | ✅ | 实时渲染 |
| 保存 | ✅ | 自动保存 |

## 任务列表

- [x] 基础编辑功能
- [x] 实时预览
- [ ] 文档管理
- [ ] 云端同步

开始创作您的文档吧！`,
        autoSave: true,
        autoSaveDelay: 3000,
        onSave: handleSave,
    });

    const documentStats = getDocumentStats();

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            {/* 顶部导航栏 */}
            <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Markdown Editor
                    </h1>
                    <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        className="px-3 py-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                        placeholder="文档标题"
                    />
                </div>

                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.username}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                    >
                        登出
                    </Button>
                </div>
            </div>

            {/* 工具栏 */}
            <EditorToolbar
                onSave={() => manualSave()}
                isSaving={editorState.isLoading}
                onFormatText={formatText}
                onInsertLink={insertLink}
                onInsertImage={insertImage}
                onInsertHeading={insertHeading}
                onInsertList={insertList}
                onInsertTable={insertTable}
                onInsertCodeBlock={insertCodeBlock}
                viewMode={editorState.viewMode}
                onViewModeChange={setViewMode}
            />

            {/* 编辑器主体 */}
            <div className="flex-1 min-h-0">
                <SplitView
                    content={editorState.content}
                    onChange={updateContent}
                    viewMode={editorState.viewMode}
                    config={editorState.config}
                    onCursorPositionChange={updateCursorPosition}
                    className="h-full"
                />
            </div>

            {/* 状态栏 */}
            <StatusBar
                isDirty={editorState.isDirty}
                isLoading={editorState.isLoading}
                error={editorState.error}
                cursorPosition={editorState.cursorPosition}
                documentStats={documentStats}
            />
        </div>
    );
}

// 主导出组件
export default function EditorPage() {
    return (
        <ProtectedRoute>
            <EditorInner />
        </ProtectedRoute>
    );
} 