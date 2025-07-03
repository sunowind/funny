import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { SplitView } from '../components/editor/SplitView';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';

// API响应类型定义
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface DocumentData {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    createdAt: string;
}

// API 调用函数
async function saveDocument(documentId: string | null, title: string, content: string, token: string, isAutoSave: boolean = false) {
    if (isAutoSave && documentId) {
        // 自动保存使用专用接口
        const response = await fetch(`/api/documents/${documentId}/autosave`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });

        if (!response.ok) {
            let errorMessage = '自动保存失败';
            try {
                const error = await response.json() as { message?: string };
                errorMessage = error.message || errorMessage;
            } catch {
                // 如果响应不是JSON格式，使用默认错误消息
            }
            throw new Error(errorMessage);
        }

        return response.json() as Promise<ApiResponse<DocumentData>>;
    } else {
        // 手动保存或新建文档
        const baseUrl = '/api/documents';
        const url = documentId ? `${baseUrl}/${documentId}` : baseUrl;
        const method = documentId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) {
            let errorMessage = '保存失败';
            try {
                const error = await response.json() as { message?: string };
                errorMessage = error.message || errorMessage;
            } catch {
                // 如果响应不是JSON格式，使用默认错误消息
            }
            throw new Error(errorMessage);
        }

        return response.json() as Promise<ApiResponse<DocumentData>>;
    }
}

async function loadDocument(documentId: string, token: string) {
    const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });


    return response.json() as Promise<ApiResponse<DocumentData>>;
}

// 状态栏组件
function StatusBar({
    isDirty,
    isLoading,
    error,
    cursorPosition,
    documentStats,
    lastSaved
}: {
    isDirty: boolean;
    isLoading: boolean;
    error: string | null;
    cursorPosition: { line: number; column: number };
    documentStats: { wordCount: number; characterCount: number; readingTime: number };
    lastSaved: Date | null;
}) {
    const formatLastSaved = (date: Date | null) => {
        if (!date) return '';
        return `最后保存: ${date.toLocaleTimeString()}`;
    };

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
                {lastSaved && (
                    <span className="text-gray-500">
                        {formatLastSaved(lastSaved)}
                    </span>
                )}
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
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const documentId = searchParams.get('id');

    const [documentTitle, setDocumentTitle] = useState('无标题文档');
    const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(documentId);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(!!documentId);

    // 保存函数
    const handleSave = useCallback(async (content: string, isAutoSave: boolean = false) => {
        if (!token) {
            throw new Error('用户未登录');
        }

        try {
            const result = await saveDocument(currentDocumentId, documentTitle, content, token, isAutoSave);

            if (!currentDocumentId && result.data?.id) {
                // 新文档创建成功，更新URL和ID
                setCurrentDocumentId(result.data.id);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('id', result.data.id);
                window.history.replaceState({}, '', newUrl.toString());
            }

            setLastSaved(new Date());
        } catch (error) {
            console.error('保存失败:', error);
            throw error;
        }
    }, [currentDocumentId, documentTitle, token]);

    // 错误处理函数
    const handleError = useCallback((error: Error, isAutoSave: boolean = false) => {
        if (isAutoSave) {
            // 自动保存失败时，仅在控制台记录警告，不打断用户操作
            console.warn('自动保存失败:', error.message);
        } else {
            // 手动保存失败时，显示错误提示
            console.error('手动保存失败:', error.message);
        }
    }, []);

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
        clearError,
        resetEditor,
    } = useMarkdownEditor({
        initialContent: '',
        autoSave: true,
        autoSaveDelay: 3000,
        onSave: handleSave,
        onError: handleError,
    });

    // 加载文档
    useEffect(() => {
        async function loadDoc() {
            if (!documentId || !token) return;

            try {
                setIsInitialLoading(true);
                const result = await loadDocument(documentId, token);

                if (result.success && result.data) {
                    setDocumentTitle(result.data.title);
                    resetEditor(result.data.content);
                    setCurrentDocumentId(result.data.id);
                    setLastSaved(new Date(result.data.updatedAt));
                }
            } catch (error) {
                console.error('加载文档失败:', error);
                // 可以显示错误提示或重定向到首页
            } finally {
                setIsInitialLoading(false);
            }
        }

        loadDoc();
    }, [documentId, token, resetEditor]);

    // 如果是初始加载状态，显示加载中
    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载文档中...</p>
                </div>
            </div>
        );
    }

    const documentStats = getDocumentStats();

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            {/* 顶部导航栏 */}
            <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/home')}
                        className="mr-2"
                    >
                        ← 返回
                    </Button>
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
                lastSaved={lastSaved}
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