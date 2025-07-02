import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

function HomeInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate('/editor');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

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

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeInner />
    </ProtectedRoute>
  );
}