import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div className="text-center py-8">加载中...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
} 