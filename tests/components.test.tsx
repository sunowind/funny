import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../app/api/auth';
import { LoginForm } from '../app/components/auth/LoginForm';
import { AuthProvider, useAuth } from '../app/context/AuthContext';

// Mock the auth API
vi.mock('../app/api/auth', () => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}));

// Test component that uses useAuth hook
function TestAuthComponent() {
    const { user, isLoading, hasError, errorMessage, login, logout } = useAuth();

    return (
        <div>
            <div data-testid="user-info">
                {user ? `Welcome ${user.username}` : 'Not logged in'}
            </div>
            <div data-testid="loading">{isLoading ? 'Loading...' : 'Ready'}</div>
            <div data-testid="error">{hasError ? errorMessage : 'No error'}</div>
            <button
                data-testid="login-btn"
                onClick={() => login('testuser', 'password123', false)}
            >
                Login
            </button>
            <button data-testid="logout-btn" onClick={logout}>Logout</button>
        </div>
    );
}

describe('Authentication Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('AuthProvider', () => {
        it('should provide initial auth state', () => {
            render(
                <AuthProvider>
                    <TestAuthComponent />
                </AuthProvider>
            );

            expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
            expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
            expect(screen.getByTestId('error')).toHaveTextContent('No error');
        });

        it('should handle successful login', async () => {
            const mockUser = {
                id: '1',
                username: 'testuser',
                email: 'test@example.com',
                avatar: null,
                createdAt: new Date(),
            };

            const mockAuthResponse = {
                user: mockUser,
                token: 'mock-token'
            };

            vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

            render(
                <AuthProvider>
                    <TestAuthComponent />
                </AuthProvider>
            );

            fireEvent.click(screen.getByTestId('login-btn'));

            // Should show loading state
            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
            });

            // Should show success state
            await waitFor(() => {
                expect(screen.getByTestId('user-info')).toHaveTextContent('Welcome testuser');
                expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
                expect(screen.getByTestId('error')).toHaveTextContent('No error');
            });

            expect(authApi.login).toHaveBeenCalledWith({
                identifier: 'testuser',
                password: 'password123',
                rememberMe: false
            });
        });

        it('should handle login failure', async () => {
            const errorMessage = 'Invalid credentials';
            vi.mocked(authApi.login).mockRejectedValue(new Error(errorMessage));

            render(
                <AuthProvider>
                    <TestAuthComponent />
                </AuthProvider>
            );

            fireEvent.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('用户名或密码错误，请重试');
                expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
                expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
            });
        });

        it('should handle logout', async () => {
            // First login
            const mockUser = {
                id: '1',
                username: 'testuser',
                email: 'test@example.com',
                avatar: null,
                createdAt: new Date(),
            };

            vi.mocked(authApi.login).mockResolvedValue({
                user: mockUser,
                token: 'mock-token'
            });

            render(
                <AuthProvider>
                    <TestAuthComponent />
                </AuthProvider>
            );

            // Login first
            fireEvent.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-info')).toHaveTextContent('Welcome testuser');
            });

            // Then logout
            fireEvent.click(screen.getByTestId('logout-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
            });
        });
    });

    describe('LoginForm', () => {
        function renderLoginForm() {
            return render(
                <AuthProvider>
                    <LoginForm />
                </AuthProvider>
            );
        }

        it('should render login form elements', () => {
            renderLoginForm();

            expect(screen.getByTestId('username-input')).toBeInTheDocument();
            expect(screen.getByTestId('password-input')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument();
        });

        it('should enable submit button when form is valid', async () => {
            renderLoginForm();

            const identifierInput = screen.getByTestId('username-input');
            const passwordInput = screen.getByTestId('password-input');
            const submitButton = screen.getByTestId('submit-button');

            // Initially disabled
            expect(submitButton).toBeDisabled();

            // Fill form with valid data
            fireEvent.change(identifierInput, { target: { value: 'testuser' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            await waitFor(() => {
                expect(submitButton).not.toBeDisabled();
            });
        });

        it('should show/hide password when toggle button is clicked', () => {
            renderLoginForm();

            const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;
            const toggleButton = screen.getByLabelText('显示密码');

            // Initially password type
            expect(passwordInput.type).toBe('password');

            // Click to show password
            fireEvent.click(toggleButton);
            expect(passwordInput.type).toBe('text');

            // Click to hide password
            fireEvent.click(toggleButton);
            expect(passwordInput.type).toBe('password');
        });

        it('should call login function on form submission', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                user: {
                    id: '1',
                    username: 'testuser',
                    email: 'test@example.com',
                    avatar: null,
                    createdAt: new Date(),
                },
                token: 'mock-token'
            });

            renderLoginForm();

            const identifierInput = screen.getByTestId('username-input');
            const passwordInput = screen.getByTestId('password-input');
            const submitButton = screen.getByTestId('submit-button');

            // Fill and submit form
            fireEvent.change(identifierInput, { target: { value: 'testuser' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(authApi.login).toHaveBeenCalledWith({
                    identifier: 'testuser',
                    password: 'password123',
                    rememberMe: false
                });
            });
        });

        it('should show error message on login failure', async () => {
            const errorMessage = 'Invalid credentials';
            vi.mocked(authApi.login).mockRejectedValue(new Error(errorMessage));

            renderLoginForm();

            const identifierInput = screen.getByTestId('username-input');
            const passwordInput = screen.getByTestId('password-input');
            const submitButton = screen.getByTestId('submit-button');

            // Fill and submit form
            fireEvent.change(identifierInput, { target: { value: 'testuser' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('用户名或密码错误，请重试')).toBeInTheDocument();
            });
        });

        it('should disable form during submission', async () => {
            // Mock a slow login response
            vi.mocked(authApi.login).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    user: {
                        id: '1',
                        username: 'testuser',
                        email: 'test@example.com',
                        avatar: null,
                        createdAt: new Date(),
                    },
                    token: 'mock-token'
                }), 100))
            );

            renderLoginForm();

            const identifierInput = screen.getByTestId('username-input');
            const passwordInput = screen.getByTestId('password-input');
            const submitButton = screen.getByTestId('submit-button');

            // Fill form
            fireEvent.change(identifierInput, { target: { value: 'testuser' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            // Submit form
            fireEvent.click(submitButton);

            // Check loading state
            await waitFor(() => {
                expect(screen.getByText('登录中...')).toBeInTheDocument();
                expect(identifierInput).toBeDisabled();
                expect(passwordInput).toBeDisabled();
                expect(submitButton).toBeDisabled();
            });

            // Wait for completion
            await waitFor(() => {
                expect(screen.getByText('登录')).toBeInTheDocument();
            }, { timeout: 200 });
        });
    });
}); 