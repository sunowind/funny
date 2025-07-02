import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { EditorConfig, Theme } from '../../types/editor';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    config: EditorConfig;
    onCursorPositionChange?: (line: number, column: number) => void;
    className?: string;
}

export interface MarkdownEditorRef {
    getEditor: () => editor.IStandaloneCodeEditor | null;
    insertText: (text: string) => void;
    formatText: (format: 'bold' | 'italic' | 'code' | 'strikethrough') => void;
    insertLink: (url?: string, text?: string) => void;
    insertImage: (url?: string, alt?: string) => void;
    insertHeading: (level: number) => void;
    focus: () => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({
    value,
    onChange,
    config,
    onCursorPositionChange,
    className = '',
}, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // 获取实际主题
    const getActualTheme = (theme: Theme): 'vs' | 'vs-dark' | 'hc-black' => {
        if (theme === 'auto') {
            // 检查系统主题偏好
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'vs-dark' : 'vs';
        }
        return theme === 'dark' ? 'vs-dark' : 'vs';
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        getEditor: () => editorRef.current,
        insertText,
        formatText,
        insertLink,
        insertImage,
        insertHeading,
        focus: () => editorRef.current?.focus(),
    }));

    // 处理编辑器挂载
    const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
        editorRef.current = editorInstance;

        // 监听光标位置变化
        editorInstance.onDidChangeCursorPosition((e) => {
            onCursorPositionChange?.(e.position.lineNumber, e.position.column);
        });

        // 添加自定义快捷键
        addCustomActions(editorInstance, monaco);
        
        // 注册自定义主题
        registerCustomThemes(monaco);
    };

    // 注册自定义主题
    const registerCustomThemes = (monaco: typeof import('monaco-editor')) => {
        // 定义自定义的暗色主题
        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'delimiter', foreground: 'D4D4D4' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'variable', foreground: '9CDCFE' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editorCursor.foreground': '#aeafad',
                'editor.selectionBackground': '#264f78',
                'editor.lineHighlightBackground': '#2f2f2f',
                'editorScrollbarSlider.background': '#79797966',
                'editorScrollbarSlider.hoverBackground': '#646464b3',
                'editorScrollbarSlider.activeBackground': '#bfbfbf66',
            }
        });

        // 定义自定义的亮色主题
        monaco.editor.defineTheme('custom-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000' },
                { token: 'keyword', foreground: '0000FF' },
                { token: 'string', foreground: 'A31515' },
                { token: 'number', foreground: '098658' },
                { token: 'delimiter', foreground: '000000' },
                { token: 'type', foreground: '267F99' },
                { token: 'variable', foreground: '001080' },
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editorLineNumber.foreground': '#237893',
                'editorCursor.foreground': '#000000',
                'editor.selectionBackground': '#ADD6FF',
                'editor.lineHighlightBackground': '#f0f0f0',
                'editorScrollbarSlider.background': '#64646466',
                'editorScrollbarSlider.hoverBackground': '#646464b3',
                'editorScrollbarSlider.activeBackground': '#00000066',
            }
        });
    };

    // 添加自定义操作
    const addCustomActions = (editorInstance: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
        // 粗体
        editorInstance.addAction({
            id: 'markdown.bold',
            label: 'Bold',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
            run: () => formatText('bold'),
        });

        // 斜体
        editorInstance.addAction({
            id: 'markdown.italic',
            label: 'Italic',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
            run: () => formatText('italic'),
        });

        // 代码
        editorInstance.addAction({
            id: 'markdown.code',
            label: 'Inline Code',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote],
            run: () => formatText('code'),
        });

        // 链接
        editorInstance.addAction({
            id: 'markdown.link',
            label: 'Link',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
            run: () => insertLink(),
        });
    };

    // 获取Monaco Editor配置
    const getEditorOptions = (): editor.IStandaloneEditorConstructionOptions => {
        const actualTheme = getActualTheme(config.theme);
        const customTheme = actualTheme === 'vs-dark' ? 'custom-dark' : 'custom-light';
        
        return {
            automaticLayout: true,
            fontSize: config.fontSize,
            fontFamily: config.fontFamily,
            lineNumbers: config.lineNumbers ? 'on' : 'off',
            wordWrap: config.wordWrap ? 'on' : 'off',
            minimap: { enabled: config.minimap },
            scrollBeyondLastLine: false,
            theme: customTheme,
            suggest: {
                showWords: false,
                showSnippets: true,
            },
            contextmenu: true,
            find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'never',
                seedSearchStringFromSelection: 'always',
            },
            smoothScrolling: true,
            mouseWheelScrollSensitivity: 1,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
            },
            // 改善编辑体验
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
            formatOnPaste: true,
            formatOnType: true,
            // 性能优化
            renderWhitespace: 'selection',
            renderControlCharacters: false,
            fontLigatures: true,
            // 行为配置
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            accessibilitySupport: 'auto',
        };
    };

    // 监听系统主题变化（仅当config.theme为'auto'时）
    useEffect(() => {
        if (config.theme !== 'auto') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = () => {
            if (editorRef.current) {
                const actualTheme = getActualTheme(config.theme);
                const customTheme = actualTheme === 'vs-dark' ? 'custom-dark' : 'custom-light';
                editorRef.current.updateOptions({ theme: customTheme });
            }
        };

        mediaQuery.addEventListener('change', handleThemeChange);
        
        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, [config.theme]);

    // 当配置变化时更新编辑器
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions(getEditorOptions());
        }
    }, [config]);

    // 插入文本（使用Monaco Editor API）
    const insertText = (text: string) => {
        if (!editorRef.current) return;
        
        const selection = editorRef.current.getSelection();
        if (selection) {
            editorRef.current.executeEdits('', [{
                range: selection,
                text,
            }]);
            
            // 设置光标位置到插入文本的末尾
            const endPosition = {
                lineNumber: selection.startLineNumber,
                column: selection.startColumn + text.length,
            };
            editorRef.current.setPosition(endPosition);
            editorRef.current.focus();
        }
    };

    // 格式化文本（粗体、斜体等）
    const formatText = (format: 'bold' | 'italic' | 'strikethrough' | 'code') => {
        if (!editorRef.current) return;

        const formatMap = {
            bold: '**',
            italic: '*',
            strikethrough: '~~',
            code: '`',
        };

        const marker = formatMap[format];
        const selection = editorRef.current.getSelection();
        
        if (selection) {
            const selectedText = editorRef.current.getModel()?.getValueInRange(selection) || 'text';
            insertText(`${marker}${selectedText}${marker}`);
        }
    };

    // 插入链接
    const insertLink = (url: string = 'url', text: string = 'link') => {
        if (!editorRef.current) return;
        
        const selection = editorRef.current.getSelection();
        const selectedText = selection ? editorRef.current.getModel()?.getValueInRange(selection) : null;
        
        if (selectedText) {
            insertText(`[${selectedText}](${url})`);
        } else {
            insertText(`[${text}](${url})`);
        }
    };

    // 插入图片
    const insertImage = (url: string = 'image-url', alt: string = 'image') => {
        insertText(`![${alt}](${url})`);
    };

    // 插入标题
    const insertHeading = (level: number) => {
        if (!editorRef.current) return;
        
        const clampedLevel = Math.max(1, Math.min(6, level));
        const prefix = '#'.repeat(clampedLevel);
        const selection = editorRef.current.getSelection();
        
        if (selection && selection.startLineNumber === selection.endLineNumber) {
            // 如果在行内，在行首插入标题标记
            const model = editorRef.current.getModel();
            if (model) {
                const lineContent = model.getLineContent(selection.startLineNumber);
                const newContent = `${prefix} ${lineContent}`;
                
                editorRef.current.executeEdits('', [{
                    range: {
                        startLineNumber: selection.startLineNumber,
                        startColumn: 1,
                        endLineNumber: selection.startLineNumber,
                        endColumn: lineContent.length + 1,
                    },
                    text: newContent,
                }]);
            }
        } else {
            insertText(`${prefix} Heading`);
        }
    };

    return (
        <div className={`markdown-editor bg-white dark:bg-gray-900 ${className}`}>
            <Editor
                value={value}
                language="markdown"
                onChange={(newValue) => onChange(newValue || '')}
                onMount={handleEditorDidMount}
                options={getEditorOptions()}
                height="100%"
                width="100%"
            />
        </div>
    );
});

MarkdownEditor.displayName = 'MarkdownEditor';

// 导出一些有用的方法和类型
export { MarkdownEditor as default };
export type { MarkdownEditorProps };

