import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../api/auth';
import { getCurrentUser, login as loginApi } from '../api/auth';

interface AuthContextProps {
    user: User | null;
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string | null;
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        getCurrentUser()
            .then((user) => {
                setUser(user);
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const login = async (identifier: string, password: string) => {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        try {
            console.log('Attempting login with:', { identifier });
            const res = await loginApi({ identifier, password });
            console.log('Login successful, user:', res.user);
            setUser(res.user);
        } catch (e: any) {
            console.error('Login failed:', e);
            setHasError(true);
            setErrorMessage(e.message || '登录失败');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setUser(null);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        try {
            await import('../api/auth').then(mod => mod.logout());
        } catch (e: any) {
            setHasError(true);
            setErrorMessage(e.message || '登出失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, hasError, errorMessage, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
