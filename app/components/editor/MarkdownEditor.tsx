import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEffect, useRef } from 'react';
import type { EditorConfig } from '../../types/editor';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    config: EditorConfig;
    onCursorPositionChange?: (line: number, column: number) => void;
    className?: string;
}

export function MarkdownEditor({
    value,
    onChange,
    config,
    onCursorPositionChange,
    className = '',
}: MarkdownEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // 处理编辑器挂载
    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;

        // 监听光标位置变化
        editor.onDidChangeCursorPosition((e) => {
            onCursorPositionChange?.(e.position.lineNumber, e.position.column);
        });

        // 配置编辑器选项
        editor.updateOptions({
            fontSize: config.fontSize,
            fontFamily: config.fontFamily,
            lineNumbers: config.lineNumbers ? 'on' : 'off',
            wordWrap: config.wordWrap ? 'on' : 'off',
            minimap: { enabled: config.minimap },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            theme: config.theme === 'dark' ? 'vs-dark' : 'vs',

            // 编辑增强
            suggest: {
                showWords: false,
                showSnippets: true,
            },

            // 其他配置
            contextmenu: true,
            find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'never',
                seedSearchStringFromSelection: 'always',
            },

            // 滚动配置
            smoothScrolling: true,
            mouseWheelScrollSensitivity: 1,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
            },
        });

        // 添加自定义快捷键
        addCustomActions(editor);
    };

    // 添加自定义操作
    const addCustomActions = (editor: editor.IStandaloneCodeEditor) => {
        // 粗体
        editor.addAction({
            id: 'markdown.bold',
            label: 'Bold',
            keybindings: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyB,
            ],
            run: () => {
                const selection = editor.getSelection();
                if (selection) {
                    const selectedText = editor.getModel()?.getValueInRange(selection) || 'text';
                    editor.executeEdits('', [
                        {
                            range: selection,
                            text: `**${selectedText}**`,
                        },
                    ]);
                }
            },
        });

        // 斜体
        editor.addAction({
            id: 'markdown.italic',
            label: 'Italic',
            keybindings: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyI,
            ],
            run: () => {
                const selection = editor.getSelection();
                if (selection) {
                    const selectedText = editor.getModel()?.getValueInRange(selection) || 'text';
                    editor.executeEdits('', [
                        {
                            range: selection,
                            text: `*${selectedText}*`,
                        },
                    ]);
                }
            },
        });

        // 代码
        editor.addAction({
            id: 'markdown.code',
            label: 'Inline Code',
            keybindings: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.Backquote,
            ],
            run: () => {
                const selection = editor.getSelection();
                if (selection) {
                    const selectedText = editor.getModel()?.getValueInRange(selection) || 'code';
                    editor.executeEdits('', [
                        {
                            range: selection,
                            text: `\`${selectedText}\``,
                        },
                    ]);
                }
            },
        });

        // 链接
        editor.addAction({
            id: 'markdown.link',
            label: 'Link',
            keybindings: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.KeyK,
            ],
            run: () => {
                const selection = editor.getSelection();
                if (selection) {
                    const selectedText = editor.getModel()?.getValueInRange(selection) || 'link';
                    editor.executeEdits('', [
                        {
                            range: selection,
                            text: `[${selectedText}](url)`,
                        },
                    ]);
                }
            },
        });
    };

    // 当配置变化时更新编辑器
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                fontSize: config.fontSize,
                fontFamily: config.fontFamily,
                lineNumbers: config.lineNumbers ? 'on' : 'off',
                wordWrap: config.wordWrap ? 'on' : 'off',
                minimap: { enabled: config.minimap },
                theme: config.theme === 'dark' ? 'vs-dark' : 'vs',
            });
        }
    }, [config]);

    // 获取编辑器实例的公共方法
    const getEditor = () => editorRef.current;

    // 插入文本
    const insertText = (text: string) => {
        if (editorRef.current) {
            const position = editorRef.current.getPosition();
            if (position) {
                editorRef.current.executeEdits('', [
                    {
                        range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                        },
                        text,
                    },
                ]);
            }
        }
    };

    return (
        <div className={`markdown-editor ${className}`}>
            <Editor
                value={value}
                onChange={(newValue) => onChange(newValue || '')}
                onMount={handleEditorDidMount}
                language="markdown"
                options={{
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    theme: 'vs',
                }}
                loading={
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">Loading editor...</div>
                    </div>
                }
            />
        </div>
    );
}

// 导出一些有用的方法和类型
export { MarkdownEditor as default };
export type { MarkdownEditorProps };

