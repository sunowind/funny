import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../api/auth';
import { getCurrentUser, login as loginApi } from '../api/auth';

interface AuthContextProps {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string | null;
    login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Token管理函数
function getStoredToken(): string | null {
    try {
        return localStorage.getItem('auth_token');
    } catch {
        return null;
    }
}

function setStoredToken(token: string): void {
    try {
        localStorage.setItem('auth_token', token);
    } catch {
        // localStorage不可用时忽略
    }
}

function removeStoredToken(): void {
    try {
        localStorage.removeItem('auth_token');
    } catch {
        // localStorage不可用时忽略
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(getStoredToken());
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
                // 如果获取用户信息失败，清除可能失效的token
                setToken(null);
                removeStoredToken();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);

        try {
            console.log('Attempting login with:', { identifier, rememberMe });
            const res = await loginApi({ identifier, password, rememberMe });
            console.log('Login successful, user:', res.user);
            setUser(res.user);
            setToken(res.token);

            if (rememberMe) {
                setStoredToken(res.token);
                console.log('User chose to be remembered');
            }
        } catch (e: any) {
            console.error('Login failed:', e);
            setHasError(true);

            if (e.message?.includes('Invalid credentials')) {
                setErrorMessage('用户名或密码错误，请重试');
            } else if (e.message?.includes('Network')) {
                setErrorMessage('网络连接失败，请检查网络设置');
            } else if (e.message?.includes('rate limit')) {
                setErrorMessage('登录尝试过于频繁，请稍后重试');
            } else {
                setErrorMessage(e.message || '登录失败，请重试');
            }

            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);

        try {
            await import('../api/auth').then(mod => mod.logout());
            setUser(null);
            setToken(null);
            removeStoredToken();
        } catch (e: any) {
            console.error('Logout error:', e);
            setHasError(true);
            setErrorMessage(e.message || '登出失败');
            setUser(null);
            setToken(null);
            removeStoredToken();
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setHasError(false);
        setErrorMessage(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            hasError,
            errorMessage,
            login,
            logout,
            clearError
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
