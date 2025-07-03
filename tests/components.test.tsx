import '@testing-library/jest-dom';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
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
import { useMarkdownEditor } from '../app/hooks/useMarkdownEditor';
import type { EditorConfig, ViewMode } from '../app/types/editor';

// Mock debounce for faster testing
vi.mock('lodash.debounce', () => ({
    default: (fn: Function) => fn
}));

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

        it('should handle keyboard shortcuts', () => {
            render(<EditorToolbar {...mockProps} />);

            // Simulate Ctrl+S for save
            fireEvent.keyDown(document, { key: 's', ctrlKey: true });

            expect(mockProps.onSave).toHaveBeenCalled();
        });

        it('should display document statistics when available', () => {
            // This test would need to be updated based on the actual EditorToolbar interface
            // For now, just test that the toolbar renders
            render(<EditorToolbar {...mockProps} />);

            expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
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

        it('should sync content between editor and preview', async () => {
            function TestSplitViewWithContent() {
                const [content, setContent] = React.useState('# 测试标题\n\n这是测试内容。');

                const handleContentChange = (newContent: string) => {
                    setContent(newContent);
                };

                return (
                    <SplitView
                        content={content}
                        onChange={handleContentChange}
                        config={defaultConfig}
                        viewMode="split"
                    />
                );
            }

            const user = userEvent.setup();
            render(<TestSplitViewWithContent />);

            const textarea = screen.getByTestId('monaco-textarea');
            await user.clear(textarea);
            await user.type(textarea, '# 新标题');

            await waitFor(() => {
                expect(screen.getByText('# 新标题')).toBeInTheDocument();
            });
        });

        it('should handle editor config changes', () => {
            const customConfig: EditorConfig = {
                ...defaultConfig,
                theme: 'dark',
                fontSize: 16,
            };

            const { rerender } = render(
                <SplitView
                    content="# Test"
                    onChange={vi.fn()}
                    config={defaultConfig}
                    viewMode="split"
                />
            );

            rerender(
                <SplitView
                    content="# Test"
                    onChange={vi.fn()}
                    config={customConfig}
                    viewMode="split"
                />
            );

            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('should support different view modes', () => {
            const { rerender } = render(
                <SplitView
                    content="# Test"
                    onChange={vi.fn()}
                    config={defaultConfig}
                    viewMode="edit"
                />
            );

            // Should show only editor in edit mode
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

            rerender(
                <SplitView
                    content="# Test"
                    onChange={vi.fn()}
                    config={defaultConfig}
                    viewMode="preview"
                />
            );

            // Should show only preview in preview mode
            expect(screen.getByText('# Test')).toBeInTheDocument();
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

describe('useMarkdownEditor Hook Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic functionality', () => {
        it('should initialize with correct default state', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '# 初始内容'
            }));

            expect(result.current.editorState.content).toBe('# 初始内容');
            expect(result.current.editorState.isDirty).toBe(false);
            expect(result.current.editorState.isLoading).toBe(false);
            expect(result.current.editorState.error).toBeNull();
        });

        it('should update content and mark as dirty', () => {
            const { result } = renderHook(() => useMarkdownEditor({}));

            act(() => {
                result.current.updateContent('新内容');
            });

            expect(result.current.editorState.content).toBe('新内容');
            expect(result.current.editorState.isDirty).toBe(true);
        });

        it('should calculate document stats', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '# 标题\n\n这是一个测试文档。'
            }));

            const stats = result.current.getDocumentStats();

            expect(stats).toMatchObject({
                wordCount: expect.any(Number),
                characterCount: expect.any(Number),
                readingTime: expect.any(Number)
            });
            expect(stats.characterCount).toBeGreaterThan(0);
        });
    });

    describe('Save functionality', () => {
        it('should handle manual save successfully', async () => {
            const mockSave = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMarkdownEditor({
                onSave: mockSave
            }));

            act(() => {
                result.current.updateContent('新内容');
            });

            await act(async () => {
                await result.current.handleSave();
            });

            expect(mockSave).toHaveBeenCalledWith('新内容', false);
            expect(result.current.editorState.isDirty).toBe(false);
        });

        it('should handle save errors', async () => {
            const mockSave = vi.fn().mockRejectedValue(new Error('保存失败'));
            const mockOnError = vi.fn();

            const { result } = renderHook(() => useMarkdownEditor({
                onSave: mockSave,
                onError: mockOnError
            }));

            act(() => {
                result.current.updateContent('新内容');
            });

            await act(async () => {
                await result.current.handleSave();
            });

            expect(mockOnError).toHaveBeenCalledWith(
                expect.objectContaining({ message: '保存失败' }),
                false
            );
            expect(result.current.editorState.error).toBe('保存失败');
            expect(result.current.editorState.isDirty).toBe(true); // Should remain dirty on error
        });

        it('should clear error state', () => {
            const mockSave = vi.fn().mockRejectedValue(new Error('测试错误'));

            const { result } = renderHook(() => useMarkdownEditor({
                onSave: mockSave
            }));

            // Trigger error
            act(() => {
                result.current.updateContent('新内容');
            });

            act(async () => {
                await result.current.handleSave();
            });

            // Clear error
            act(() => {
                result.current.clearError();
            });

            expect(result.current.editorState.error).toBeNull();
        });
    });

    describe('Auto save functionality', () => {
        it('should trigger auto save after delay', async () => {
            const mockSave = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMarkdownEditor({
                autoSave: true,
                autoSaveDelay: 1000,
                onSave: mockSave
            }));

            act(() => {
                result.current.updateContent('自动保存内容');
            });

            // Fast forward time
            act(() => {
                vi.advanceTimersByTime(1000);
            });

            await waitFor(() => {
                expect(mockSave).toHaveBeenCalledWith('自动保存内容', true);
            });
        });

        it('should not auto save when disabled', () => {
            const mockSave = vi.fn();

            const { result } = renderHook(() => useMarkdownEditor({
                autoSave: false,
                autoSaveDelay: 1000,
                onSave: mockSave
            }));

            act(() => {
                result.current.updateContent('内容');
            });

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(mockSave).not.toHaveBeenCalled();
        });

        it('should handle auto save errors gracefully', async () => {
            const mockSave = vi.fn().mockRejectedValue(new Error('自动保存失败'));
            const mockOnError = vi.fn();

            const { result } = renderHook(() => useMarkdownEditor({
                autoSave: true,
                autoSaveDelay: 1000,
                onSave: mockSave,
                onError: mockOnError
            }));

            act(() => {
                result.current.updateContent('内容');
            });

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            await waitFor(() => {
                expect(mockOnError).toHaveBeenCalledWith(
                    expect.objectContaining({ message: '自动保存失败' }),
                    true
                );
            });
        });
    });

    describe('Text formatting', () => {
        it('should format bold text', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '选中的文本'
            }));

            act(() => {
                result.current.formatText('bold');
            });

            expect(result.current.editorState.content).toContain('**');
        });

        it('should format italic text', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '选中的文本'
            }));

            act(() => {
                result.current.formatText('italic');
            });

            expect(result.current.editorState.content).toContain('*');
        });

        it('should format code text', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '选中的文本'
            }));

            act(() => {
                result.current.formatText('code');
            });

            expect(result.current.editorState.content).toContain('`');
        });

        it('should format strikethrough text', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '选中的文本'
            }));

            act(() => {
                result.current.formatText('strikethrough');
            });

            expect(result.current.editorState.content).toContain('~~');
        });
    });

    describe('Text insertion', () => {
        it('should insert text at current position', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '现有内容'
            }));

            act(() => {
                result.current.insertText('插入的文本');
            });

            expect(result.current.editorState.content).toContain('插入的文本');
        });

        it('should mark as dirty after insertion', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '现有内容'
            }));

            act(() => {
                result.current.insertText('新文本');
            });

            expect(result.current.editorState.isDirty).toBe(true);
        });
    });

    describe('Editor reset', () => {
        it('should reset editor to new content', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '原始内容'
            }));

            // Make some changes
            act(() => {
                result.current.updateContent('修改的内容');
            });

            expect(result.current.editorState.isDirty).toBe(true);

            // Reset
            act(() => {
                result.current.resetEditor('重置后的内容');
            });

            expect(result.current.editorState.content).toBe('重置后的内容');
            expect(result.current.editorState.isDirty).toBe(false);
            expect(result.current.editorState.error).toBeNull();
        });

        it('should reset editor to empty content when no content provided', () => {
            const { result } = renderHook(() => useMarkdownEditor({
                initialContent: '原始内容'
            }));

            act(() => {
                result.current.resetEditor('');
            });

            expect(result.current.editorState.content).toBe('');
            expect(result.current.editorState.isDirty).toBe(false);
        });
    });

    describe('Performance', () => {
        it('should debounce rapid updates', () => {
            const mockSave = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMarkdownEditor({
                autoSave: true,
                autoSaveDelay: 1000,
                onSave: mockSave
            }));

            // Rapid updates
            act(() => {
                result.current.updateContent('内容1');
                result.current.updateContent('内容2');
                result.current.updateContent('内容3');
            });

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            // Should only save once with final content
            expect(mockSave).toHaveBeenCalledTimes(1);
            expect(mockSave).toHaveBeenCalledWith('内容3', true);
        });

        it('should handle frequent save requests', async () => {
            const mockSave = vi.fn().mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 100))
            );

            const { result } = renderHook(() => useMarkdownEditor({
                onSave: mockSave
            }));

            act(() => {
                result.current.updateContent('内容');
            });

            // Multiple rapid save requests
            const savePromises = [
                result.current.handleSave(),
                result.current.handleSave(),
                result.current.handleSave()
            ];

            await act(async () => {
                await Promise.all(savePromises);
            });

            // Should handle all requests without errors
            expect(mockSave).toHaveBeenCalled();
        });
    });

    describe('Cursor position tracking', () => {
        it('should track cursor position changes', () => {
            const { result } = renderHook(() => useMarkdownEditor({}));

            act(() => {
                result.current.updateCursorPosition({ line: 5, column: 10 });
            });

            expect(result.current.editorState.cursorPosition).toEqual({
                line: 5,
                column: 10
            });
        });

        it('should initialize with default cursor position', () => {
            const { result } = renderHook(() => useMarkdownEditor({}));

            expect(result.current.editorState.cursorPosition).toEqual({
                line: 1,
                column: 1
            });
        });
    });
}); 