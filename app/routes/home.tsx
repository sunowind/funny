import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Button } from '../components/ui/button';
import { AuthProvider, useAuth } from '../context/AuthContext';

function HomeInner() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 flex flex-col items-center">
        <img src={user?.avatar} alt="avatar" className="w-20 h-20 rounded-full mb-4" />
        <h2 className="text-xl font-bold mb-2">欢迎，{user?.username}！</h2>
        <p className="mb-4 text-zinc-500">{user?.email}</p>
        <Button
          variant="destructive"
          onClick={logout}
        >登出</Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <HomeInner />
      </ProtectedRoute>
    </AuthProvider>
  );
}
