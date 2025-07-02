import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MarkdownEditor } from '../../app/components/editor/MarkdownEditor';
import type { EditorConfig } from '../../app/types/editor';

// Mock Monaco Editor
const mockOnChange = vi.fn();
const mockSetValue = vi.fn();
const mockGetValue = vi.fn().mockReturnValue('');
const mockDispose = vi.fn();
const mockAddCommand = vi.fn();
const mockAddAction = vi.fn();
const mockUpdateOptions = vi.fn();

const mockEditor = {
    setValue: mockSetValue,
    getValue: mockGetValue,
    onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeCursorPosition: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    addCommand: mockAddCommand,
    addAction: mockAddAction,
    updateOptions: mockUpdateOptions,
    dispose: mockDispose,
    focus: vi.fn(),
    getModel: vi.fn().mockReturnValue({
        getLinesContent: vi.fn().mockReturnValue(['# Hello World', 'This is a test']),
        getLineCount: vi.fn().mockReturnValue(2),
        getValueInRange: vi.fn().mockReturnValue('selected text'),
    }),
    getPosition: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
    setPosition: vi.fn(),
    revealLine: vi.fn(),
    revealLineInCenter: vi.fn(),
    getSelection: vi.fn().mockReturnValue({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
    }),
    executeEdits: vi.fn(),
};

// Mock Monaco global
Object.defineProperty(window, 'monaco', {
    value: {
        KeyMod: {
            CtrlCmd: 2048,
        },
        KeyCode: {
            KeyB: 21,
            KeyI: 23,
            Backquote: 86,
            KeyK: 37,
        },
    },
    writable: true,
});

vi.mock('@monaco-editor/react', () => ({
    default: ({ onChange, onMount, value, options, ...props }: any) => {
        React.useEffect(() => {
            if (onMount) {
                onMount(mockEditor);
            }
        }, [onMount]);

        return (
            <div
                data-testid="monaco-editor"
                data-value={value}
                data-options={JSON.stringify(options)}
                {...props}
            >
                <textarea
                    data-testid="monaco-textarea"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            </div>
        );
    },
}));

// Mock useMarkdownEditor hook
const mockUseMarkdownEditor = {
    content: '',
    setContent: vi.fn(),
    isAutoSaving: false,
    lastSaved: null,
    saveDocument: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    wordCount: 0,
    characterCount: 0,
    lineCount: 1,
    cursorPosition: { line: 1, column: 1 },
    insertText: vi.fn(),
    formatText: vi.fn(),
    searchText: vi.fn(),
    replaceText: vi.fn(),
};

vi.mock('../../app/hooks/useMarkdownEditor', () => ({
    useMarkdownEditor: () => mockUseMarkdownEditor,
}));

describe('MarkdownEditor', () => {
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

    const defaultProps = {
        value: '',
        onChange: mockOnChange,
        config: defaultConfig,
        className: '',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should initialize with default content', async () => {
        const initialContent = '# Hello World\n\nThis is a test document.';

        render(
            <MarkdownEditor
                {...defaultProps}
                value={initialContent}
            />
        );

        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveAttribute('data-value', initialContent);
    });

    test('should handle text input and trigger onChange', async () => {
        const user = userEvent.setup();

        render(<MarkdownEditor {...defaultProps} />);

        const textarea = screen.getByTestId('monaco-textarea');
        await user.type(textarea, '# New Content');

        expect(mockOnChange).toHaveBeenCalledWith('# New Content');
    });

    test('should apply syntax highlighting correctly', () => {
        render(<MarkdownEditor {...defaultProps} />);

        const editor = screen.getByTestId('monaco-editor');
        const options = JSON.parse(editor.getAttribute('data-options') || '{}');

        expect(options.language).toBe('markdown');
        expect(options.theme).toBeDefined();
    });

    test('should handle keyboard shortcuts', async () => {
        render(<MarkdownEditor {...defaultProps} />);

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });

        // 验证快捷键动作是否被注册
        const addActionCalls = mockAddAction.mock.calls;

        // 检查常用快捷键是否被注册
        const actionIds = addActionCalls.map(call => call[0].id);
        expect(actionIds).toContain('markdown.bold');
        expect(actionIds).toContain('markdown.italic');
        expect(actionIds).toContain('markdown.code');
        expect(actionIds).toContain('markdown.link');
    });

    test('should support custom themes via config', () => {
        const darkConfig = { ...defaultConfig, theme: 'dark' as const };

        render(
            <MarkdownEditor
                {...defaultProps}
                config={darkConfig}
            />
        );

        expect(mockUpdateOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                theme: 'vs',
            })
        );
    });

    test('should support different font sizes via config', () => {
        const customConfig = { ...defaultConfig, fontSize: 18 };

        render(
            <MarkdownEditor
                {...defaultProps}
                config={customConfig}
            />
        );

        expect(mockUpdateOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                fontSize: 18,
            })
        );
    });

    test('should handle line numbers toggle via config', () => {
        const configWithoutLineNumbers = { ...defaultConfig, lineNumbers: false };

        render(
            <MarkdownEditor
                {...defaultProps}
                config={configWithoutLineNumbers}
            />
        );

        expect(mockUpdateOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                lineNumbers: 'off',
            })
        );
    });

    test('should handle word wrap toggle via config', () => {
        const configWithoutWordWrap = { ...defaultConfig, wordWrap: false };

        render(
            <MarkdownEditor
                {...defaultProps}
                config={configWithoutWordWrap}
            />
        );

        expect(mockUpdateOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                wordWrap: 'off',
            })
        );
    });

    test('should handle minimap toggle via config', () => {
        const configWithMinimap = { ...defaultConfig, minimap: true };

        render(
            <MarkdownEditor
                {...defaultProps}
                config={configWithMinimap}
            />
        );

        expect(mockUpdateOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                minimap: { enabled: true },
            })
        );
    });

    test('should call onCursorPositionChange when cursor moves', async () => {
        const onCursorPositionChange = vi.fn();

        render(
            <MarkdownEditor
                {...defaultProps}
                onCursorPositionChange={onCursorPositionChange}
            />
        );

        // Wait for editor to mount
        await waitFor(() => {
            expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();
        });

        // Simulate cursor position change
        const cursorChangeCallback = mockEditor.onDidChangeCursorPosition.mock.calls[0][0];
        cursorChangeCallback({ position: { lineNumber: 2, column: 5 } });

        expect(onCursorPositionChange).toHaveBeenCalledWith(2, 5);
    });

    test('should handle content updates from props', () => {
        const { rerender } = render(
            <MarkdownEditor
                {...defaultProps}
                value="Initial content"
            />
        );

        rerender(
            <MarkdownEditor
                {...defaultProps}
                value="Updated content"
            />
        );

        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toHaveAttribute('data-value', 'Updated content');
    });

    test('should update editor options when config changes', () => {
        const { rerender } = render(
            <MarkdownEditor
                {...defaultProps}
                config={defaultConfig}
            />
        );

        const newConfig = { ...defaultConfig, fontSize: 16, wordWrap: false };

        rerender(
            <MarkdownEditor
                {...defaultProps}
                config={newConfig}
            />
        );

        // Should call updateOptions twice: once on mount, once on config change
        expect(mockUpdateOptions).toHaveBeenCalledTimes(2);
        expect(mockUpdateOptions).toHaveBeenLastCalledWith(
            expect.objectContaining({
                fontSize: 16,
                wordWrap: 'off',
            })
        );
    });

    test('should execute bold formatting when bold action is triggered', async () => {
        render(<MarkdownEditor {...defaultProps} />);

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });

        // Find and execute the bold action
        const boldAction = mockAddAction.mock.calls.find(
            call => call[0].id === 'markdown.bold'
        )?.[0];

        expect(boldAction).toBeDefined();

        // Execute the action
        boldAction.run();

        expect(mockEditor.executeEdits).toHaveBeenCalledWith('', [
            expect.objectContaining({
                text: '**selected text**',
            }),
        ]);
    });

    test('should execute italic formatting when italic action is triggered', async () => {
        render(<MarkdownEditor {...defaultProps} />);

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });

        // Find and execute the italic action
        const italicAction = mockAddAction.mock.calls.find(
            call => call[0].id === 'markdown.italic'
        )?.[0];

        expect(italicAction).toBeDefined();

        // Execute the action
        italicAction.run();

        expect(mockEditor.executeEdits).toHaveBeenCalledWith('', [
            expect.objectContaining({
                text: '*selected text*',
            }),
        ]);
    });

    test('should execute code formatting when code action is triggered', async () => {
        render(<MarkdownEditor {...defaultProps} />);

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });

        // Find and execute the code action
        const codeAction = mockAddAction.mock.calls.find(
            call => call[0].id === 'markdown.code'
        )?.[0];

        expect(codeAction).toBeDefined();

        // Execute the action
        codeAction.run();

        expect(mockEditor.executeEdits).toHaveBeenCalledWith('', [
            expect.objectContaining({
                text: '`selected text`',
            }),
        ]);
    });

    test('should execute link formatting when link action is triggered', async () => {
        render(<MarkdownEditor {...defaultProps} />);

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });

        // Find and execute the link action
        const linkAction = mockAddAction.mock.calls.find(
            call => call[0].id === 'markdown.link'
        )?.[0];

        expect(linkAction).toBeDefined();

        // Execute the action
        linkAction.run();

        expect(mockEditor.executeEdits).toHaveBeenCalledWith('', [
            expect.objectContaining({
                text: '[selected text](url)',
            }),
        ]);
    });

    test('should handle large content efficiently', () => {
        const largeContent = '# Large Document\n\n' + 'Lorem ipsum '.repeat(10000);

        render(
            <MarkdownEditor
                {...defaultProps}
                value={largeContent}
            />
        );

        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveAttribute('data-value', largeContent);
    });

    test('should apply custom className', () => {
        const customClassName = 'custom-editor-class';

        render(
            <MarkdownEditor
                {...defaultProps}
                className={customClassName}
            />
        );

        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toHaveClass(customClassName);
    });
}); 