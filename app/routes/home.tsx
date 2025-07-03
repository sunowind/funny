import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';

// API响应类型定义
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface DocumentItem {
  id: string;
  title: string;
  tags: string[];
  wordCount: number;
  readingTime: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListResponse {
  documents: DocumentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API调用函数
async function fetchDocuments(token: string, page: number = 1, search: string = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
  });

  if (search) {
    params.append('search', search);
  }

  const response = await fetch(`/api/documents?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取文档列表失败');
  }

  return response.json() as Promise<ApiResponse<DocumentListResponse>>;
}

async function deleteDocument(documentId: string, token: string) {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('删除文档失败');
  }

  return response.json();
}

// 文档卡片组件
function DocumentCard({
  document,
  onDelete
}: {
  document: DocumentItem;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个文档吗？')) return;

    setIsDeleting(true);
    try {
      await onDelete(document.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 mr-4">
          <Link
            to={`/editor?id=${document.id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {document.title}
          </Link>
        </h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link to={`/editor?id=${document.id}`}>
              编辑
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            {isDeleting ? '删除中...' : '删除'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {document.tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex space-x-4">
          <span>{document.wordCount} 字</span>
          <span>约 {document.readingTime} 分钟阅读</span>
        </div>
        <div className="text-right">
          <div>创建: {formatDate(document.createdAt)}</div>
          <div>修改: {formatDate(document.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
}

// 文档列表组件（已登录用户）
function DocumentDashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载文档列表
  const loadDocuments = async (page: number = 1, search: string = '') => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchDocuments(token, page, search);

      if (result.success && result.data) {
        setDocuments(result.data.documents);
        setPagination(result.data.pagination);
      } else {
        setError('获取文档列表失败');
      }
    } catch (err) {
      console.error('Load documents error:', err);
      setError(err instanceof Error ? err.message : '获取文档列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除文档
  const handleDeleteDocument = async (documentId: string) => {
    if (!token) return;

    try {
      await deleteDocument(documentId, token);
      // 重新加载当前页面的文档列表
      await loadDocuments(pagination.page, searchQuery);
    } catch (err) {
      console.error('Delete document error:', err);
      alert(err instanceof Error ? err.message : '删除文档失败');
    }
  };

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments(1, searchQuery);
  };

  // 页面切换
  const handlePageChange = (newPage: number) => {
    loadDocuments(newPage, searchQuery);
  };

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                我的文档
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/editor')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                新建文档
              </Button>
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
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜索栏 */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex space-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档标题或内容..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" variant="outline">
              搜索
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  loadDocuments(1, '');
                }}
              >
                清除
              </Button>
            )}
          </form>
        </div>

        {/* 错误状态 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDocuments(pagination.page, searchQuery)}
              className="mt-2"
            >
              重试
            </Button>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 文档列表 */}
        {!isLoading && !error && (
          <>
            {documents.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? '没有找到匹配的文档' : '还没有文档'}
                </div>
                <Button
                  onClick={() => navigate('/editor')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  创建第一个文档
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      onDelete={handleDeleteDocument}
                    />
                  ))}
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-4 mt-8">
                    <Button
                      variant="outline"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      第 {pagination.page} 页，共 {pagination.totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// 主页面组件
function HomeInner() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 如果已登录，显示文档仪表板
  if (user) {
    return <DocumentDashboard />;
  }

  // 如果未登录，显示主页和登录入口
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 flex flex-col items-center max-w-md w-full mx-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            欢迎使用 Markdown 编辑器
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            一个现代化的在线 Markdown 编辑器，支持实时预览、语法高亮和多种主题。
          </p>
          <div className="grid grid-cols-1 gap-4 text-sm text-left">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>实时预览和语法高亮</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>支持深浅色主题切换</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>自动保存和版本管理</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>响应式设计，支持移动端</span>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => setShowLoginModal(true)}
          className="w-full"
          data-testid="login-button"
        >
          立即登录使用
        </Button>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          需要登录后才能使用编辑器功能
        </p>
      </div>

      {/* 登录模态框 */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>登录</DialogTitle>
          </DialogHeader>
          <LoginForm onSuccess={() => setShowLoginModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomePage() {
  return <HomeInner />;
}