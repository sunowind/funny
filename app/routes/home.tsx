import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

function HomeInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate('/editor');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // 如果已登录，显示用户信息
  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 flex flex-col items-center max-w-md w-full mx-4">
          <img
            src={user?.avatar || '/favicon.ico'}
            alt="avatar"
            className="w-20 h-20 rounded-full mb-4"
          />
          <h2 className="text-xl font-bold mb-2">欢迎，{user?.username}！</h2>
          <p className="mb-4 text-zinc-500 text-center">{user?.email}</p>

          {/* 跳转提示 */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              正在为您准备 Markdown 编辑器...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          </div>

          <div className="flex space-x-3 w-full">
            <Button
              variant="default"
              onClick={() => navigate('/editor')}
              className="flex-1"
            >
              立即进入编辑器
            </Button>
            <Button
              variant="destructive"
              onClick={logout}
            >
              登出
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 如果未登录，显示Home页面内容和登录按钮
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
        <DialogContent className="sm:max-w-md" data-testid="login-modal">
          <DialogHeader>
            <DialogTitle className="text-center">登录</DialogTitle>
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