import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { AuthProvider, useAuth } from '../context/AuthContext';

function LoginPageInner() {
    const { user } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (user) {
            console.log('User logged in, redirecting to editor:', user);
            navigate('/editor', { replace: true });
        }
    }, [user, navigate]);
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>
                <LoginForm />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <AuthProvider>
            <LoginPageInner />
        </AuthProvider>
    );
}
