import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

export function LoginForm() {
    const { login, isLoading, hasError, errorMessage } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [touched, setTouched] = useState(false);

    const isIdentifierValid = identifier.length >= 3;
    const isPasswordValid = password.length >= 6;
    const canSubmit = isIdentifierValid && isPasswordValid && !isLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;
        await login(identifier, password, remember);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md space-y-6">
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="identifier">用户名或邮箱</label>
                <input
                    id="identifier"
                    type="text"
                    className="input input-bordered w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoComplete="username"
                    disabled={isLoading}
                />
                {touched && !isIdentifierValid && (
                    <div className="text-xs text-red-500 mt-1">请输入有效的用户名或邮箱</div>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">密码</label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="input input-bordered w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={isLoading}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        tabIndex={-1}
                        onClick={() => setShowPassword(v => !v)}
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </Button>
                </div>
                {touched && !isPasswordValid && (
                    <div className="text-xs text-red-500 mt-1">密码至少6位</div>
                )}
            </div>
            <div className="flex items-center justify-between">
                <label className="flex items-center text-sm">
                    <input
                        type="checkbox"
                        className="mr-2"
                        checked={remember}
                        onChange={e => setRemember(e.target.checked)}
                        disabled={isLoading}
                    />
                    记住我
                </label>
                <Button
                    type="submit"
                    disabled={!canSubmit}
                >
                    {isLoading ? '登录中...' : '登录'}
                </Button>
            </div>
            {hasError && (
                <div className="text-sm text-red-500 text-center">{errorMessage}</div>
            )}
        </form>
    );
}
