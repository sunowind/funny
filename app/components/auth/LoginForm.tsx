import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

interface LoginFormProps {
    onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps = {}) {
    const { login, isLoading, hasError, errorMessage } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [touched, setTouched] = useState(false);

    const isIdentifierValid = identifier.length >= 3;
    const isPasswordValid = password.length >= 6;
    const canSubmit = isIdentifierValid && isPasswordValid && !isLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;
        
        try {
            await login(identifier, password, rememberMe);
            // 登录成功后调用回调
            onSuccess?.();
        } catch (error) {
            // 错误处理已在AuthContext中完成
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canSubmit) {
            handleSubmit(e as any);
        }
    };

    return (
        <form 
            onSubmit={handleSubmit} 
            className="w-full max-w-sm mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md space-y-6"
            aria-label="登录表单"
            role="form"
        >
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="identifier">
                    用户名或邮箱
                    <span className="text-red-500 ml-1" aria-label="必填">*</span>
                </label>
                <input
                    id="identifier"
                    type="text"
                    className={`input input-bordered w-full px-3 py-2 rounded border ${
                        touched && !isIdentifierValid 
                            ? 'border-red-500 dark:border-red-400' 
                            : 'border-zinc-300 dark:border-zinc-700'
                    } bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary`}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="username"
                    disabled={isLoading}
                    data-testid="username-input"
                    aria-required="true"
                    aria-invalid={touched && !isIdentifierValid}
                    aria-describedby={touched && !isIdentifierValid ? "identifier-error" : undefined}
                />
                {touched && !isIdentifierValid && (
                    <div id="identifier-error" className="text-xs text-red-500 mt-1" role="alert">
                        请输入有效的用户名或邮箱（至少3个字符）
                    </div>
                )}
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">
                    密码
                    <span className="text-red-500 ml-1" aria-label="必填">*</span>
                </label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`input input-bordered w-full px-3 py-2 rounded border ${
                            touched && !isPasswordValid 
                                ? 'border-red-500 dark:border-red-400' 
                                : 'border-zinc-300 dark:border-zinc-700'
                        } bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary pr-10`}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="current-password"
                        disabled={isLoading}
                        data-testid="password-input"
                        aria-required="true"
                        aria-invalid={touched && !isPasswordValid}
                        aria-describedby={touched && !isPasswordValid ? "password-error" : "password-help"}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        tabIndex={-1}
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        aria-pressed={showPassword}
                        disabled={isLoading}
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </Button>
                </div>
                <div id="password-help" className="text-xs text-gray-500 mt-1">
                    密码至少需要6个字符
                </div>
                {touched && !isPasswordValid && (
                    <div id="password-error" className="text-xs text-red-500 mt-1" role="alert">
                        密码至少需要6个字符
                    </div>
                )}
            </div>
            
            <div className="flex items-center">
                <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    data-testid="remember-me"
                    disabled={isLoading}
                    aria-describedby="remember-me-help"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    记住我
                </label>
                <div id="remember-me-help" className="sr-only">
                    勾选此项将延长登录有效期至30天
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    data-testid="submit-button"
                    aria-describedby={hasError ? "login-error" : undefined}
                >
                    {isLoading ? '登录中...' : '登录'}
                </Button>
            </div>
            
            {hasError && (
                <div id="login-error" className="text-sm text-red-500 text-center" role="alert" aria-live="polite">
                    {errorMessage}
                </div>
            )}
        </form>
    );
}
