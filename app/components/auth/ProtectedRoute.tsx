import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!isLoading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, isLoading, navigate]);
    
    if (isLoading) return <div className="text-center py-8">加载中...</div>;
    if (!user) return <div className="text-center py-8">正在跳转到登录页...</div>;
    return <>{children}</>;
} 