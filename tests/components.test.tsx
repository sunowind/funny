import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../app/api/auth';
import { LoginForm } from '../app/components/auth/LoginForm';
import { EditorToolbar } from '../app/components/editor/EditorToolbar';
import { MarkdownEditor } from '../app/components/editor/MarkdownEditor';
import { PreviewPane } from '../app/components/editor/PreviewPane';
import { SplitView } from '../app/components/editor/SplitView';
import { AuthProvider, useAuth } from '../app/context/AuthContext';
import type { EditorConfig, ViewMode } from '../app/types/editor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange, onMount, ...props }) => (
    <div data-testid="monaco-editor" {...props}>
      <textarea
        data-testid="monaco-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => onMount?.({
          getSelection: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }),
          getModel: () => ({ getValueInRange: () => 'selected text' }),
          executeEdits: vi.fn(),
          setPosition: vi.fn(),
          focus: vi.fn(),
          addAction: vi.fn(),
          updateOptions: vi.fn(),
          onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
          onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
          getScrollTop: () => 0,
          getScrollHeight: () => 1000,
          setScrollTop: vi.fn(),
          getLayoutInfo: () => ({ height: 400 })
        }, {
          KeyMod: { CtrlCmd: 1 },
          KeyCode: { KeyB: 2, KeyI: 3, KeyK: 4, Backquote: 5 },
          editor: {
            defineTheme: vi.fn()
          }
        })}
      />
    </div>
  ))
}));

// Mock parseMarkdown
vi.mock('../app/lib/markdown/parser', () => ({
  parseMarkdown: vi.fn((content) => `<p>${content}</p>`),
  calculateDocumentStats: vi.fn((content) => ({
    wordCount: content.split(' ').length,
    characterCount: content.length,
    readingTime: 1
  }))
}));

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

describe('Markdown Editor Components', () => {
    const defaultConfig: EditorConfig = {
        theme: 'light',
        fontSize: 14,
        fontFamily: 'Monaco, monospace',
        lineNumbers: true,
        wordWrap: true,
        minimap: false,
        autoSave: true,
        autoSaveDelay: 3000,
        splitRatio: 0.5,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('MarkdownEditor', () => {
        const mockProps = {
            value: '# Hello World\n\nThis is a test.',
            onChange: vi.fn(),
            config: defaultConfig,
            onCursorPositionChange: vi.fn(),
        };

        it('should render Monaco Editor', () => {
            render(<MarkdownEditor {...mockProps} />);
            
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
            expect(screen.getByTestId('monaco-textarea')).toHaveValue(mockProps.value);
        });

        it('should call onChange when content changes', async () => {
            const user = userEvent.setup();
            render(<MarkdownEditor {...mockProps} />);
            
            const textarea = screen.getByTestId('monaco-textarea');
            await user.clear(textarea);
            await user.type(textarea, '## New Content');
            
            expect(mockProps.onChange).toHaveBeenCalledWith('## New Content');
        });

        it('should handle cursor position changes', async () => {
            render(<MarkdownEditor {...mockProps} />);
            
            const textarea = screen.getByTestId('monaco-textarea');
            await act(async () => {
                fireEvent.focus(textarea);
            });
            
            expect(mockProps.onCursorPositionChange).toHaveBeenCalled();
        });

        it('should support ref methods', () => {
            const ref = React.createRef<any>();
            render(<MarkdownEditor {...mockProps} ref={ref} />);
            
            expect(ref.current).toBeTruthy();
            expect(typeof ref.current.insertText).toBe('function');
            expect(typeof ref.current.formatText).toBe('function');
            expect(typeof ref.current.focus).toBe('function');
        });
    });

    describe('PreviewPane', () => {
        const mockProps = {
            content: '# Hello World\n\nThis is **bold** text.',
            onScroll: vi.fn(),
        };

        it('should render markdown content', () => {
            render(<PreviewPane {...mockProps} />);
            
            expect(screen.getByText('# Hello World')).toBeInTheDocument();
        });

        it('should handle scroll events', async () => {
            render(<PreviewPane {...mockProps} />);
            
            const previewPane = screen.getByRole('generic');
            fireEvent.scroll(previewPane);
            
            expect(mockProps.onScroll).toHaveBeenCalled();
        });

        it('should support custom options', () => {
            const customProps = {
                ...mockProps,
                options: {
                    enableMath: false,
                    enableMermaid: false,
                }
            };
            
            render(<PreviewPane {...customProps} />);
            expect(screen.getByText('# Hello World')).toBeInTheDocument();
        });
    });

    describe('EditorToolbar', () => {
        const mockProps = {
            onSave: vi.fn(),
            onFormatText: vi.fn(),
            onInsertLink: vi.fn(),
            onInsertImage: vi.fn(),
            onInsertHeading: vi.fn(),
            onInsertList: vi.fn(),
            onInsertTable: vi.fn(),
            onInsertCodeBlock: vi.fn(),
            viewMode: 'split' as ViewMode,
            onViewModeChange: vi.fn(),
        };

        it('should render all toolbar buttons', () => {
            render(<EditorToolbar {...mockProps} />);
            
            expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /分屏/ })).toBeInTheDocument();
        });

        it('should call onSave when save button is clicked', async () => {
            const user = userEvent.setup();
            render(<EditorToolbar {...mockProps} />);
            
            const saveButton = screen.getByRole('button', { name: /保存/ });
            await user.click(saveButton);
            
            expect(mockProps.onSave).toHaveBeenCalled();
        });

        it('should handle format text actions', async () => {
            const user = userEvent.setup();
            render(<EditorToolbar {...mockProps} />);
            
            // Find bold button by its text content 
            const boldButton = screen.getByRole('button', { name: /B/ });
            await user.click(boldButton);
            
            expect(mockProps.onFormatText).toHaveBeenCalledWith('bold');
        });

        it('should handle view mode changes', async () => {
            const user = userEvent.setup();
            render(<EditorToolbar {...mockProps} />);
            
            const editButton = screen.getByRole('button', { name: /编辑/ });
            await user.click(editButton);
            
            expect(mockProps.onViewModeChange).toHaveBeenCalledWith('edit');
        });

        it('should show loading state when saving', () => {
            const loadingProps = { ...mockProps, isSaving: true };
            render(<EditorToolbar {...loadingProps} />);
            
            expect(screen.getByText('保存中...')).toBeInTheDocument();
        });
    });

    describe('SplitView', () => {
        const mockProps = {
            content: '# Test Content',
            onChange: vi.fn(),
            viewMode: 'split' as ViewMode,
            config: defaultConfig,
            onCursorPositionChange: vi.fn(),
        };

        it('should render split view with editor and preview', () => {
            render(<SplitView {...mockProps} />);
            
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
            expect(screen.getByText('# Test Content')).toBeInTheDocument();
        });

        it('should render only editor in edit mode', () => {
            const editProps = { ...mockProps, viewMode: 'edit' as ViewMode };
            render(<SplitView {...editProps} />);
            
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
            // Preview should not be rendered in edit mode
            expect(screen.queryByText('# Test Content')).not.toBeInTheDocument();
        });

        it('should render only preview in preview mode', () => {
            const previewProps = { ...mockProps, viewMode: 'preview' as ViewMode };
            render(<SplitView {...previewProps} />);
            
            expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
            expect(screen.getByText('# Test Content')).toBeInTheDocument();
        });

        it('should handle content changes', async () => {
            const user = userEvent.setup();
            render(<SplitView {...mockProps} />);
            
            const textarea = screen.getByTestId('monaco-textarea');
            await user.clear(textarea);
            await user.type(textarea, '## Updated Content');
            
            expect(mockProps.onChange).toHaveBeenCalledWith('## Updated Content');
        });
    });

    describe('Editor Integration', () => {
        it('should handle complete editor workflow', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();
            const mockOnChange = vi.fn();

            // Render complete editor with toolbar and split view
            render(
                <div>
                    <EditorToolbar
                        onSave={mockOnSave}
                        onFormatText={vi.fn()}
                        onInsertLink={vi.fn()}
                        onInsertImage={vi.fn()}
                        onInsertHeading={vi.fn()}
                        onInsertList={vi.fn()}
                        onInsertTable={vi.fn()}
                        onInsertCodeBlock={vi.fn()}
                        viewMode="split"
                        onViewModeChange={vi.fn()}
                    />
                    <SplitView
                        content="# Initial Content"
                        onChange={mockOnChange}
                        viewMode="split"
                        config={defaultConfig}
                    />
                </div>
            );

            // Type in editor
            const textarea = screen.getByTestId('monaco-textarea');
            await user.clear(textarea);
            await user.type(textarea, '# New Document\n\nHello world!');

            // Save document
            const saveButton = screen.getByRole('button', { name: /保存/ });
            await user.click(saveButton);

            expect(mockOnChange).toHaveBeenCalledWith('# New Document\n\nHello world!');
            expect(mockOnSave).toHaveBeenCalled();
        });
    });
}); 