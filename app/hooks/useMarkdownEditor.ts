import { useCallback, useEffect, useRef, useState } from 'react';
import { calculateDocumentStats, parseMarkdown } from '../lib/markdown/parser';
import type { EditorConfig, EditorState, ViewMode } from '../types/editor';

interface UseMarkdownEditorOptions {
  initialContent?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (content: string) => Promise<void>;
  onContentChange?: (content: string) => void;
}

const defaultConfig: EditorConfig = {
  theme: 'light',
  fontSize: 14,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  lineNumbers: true,
  wordWrap: true,
  minimap: false,
  autoSave: true,
  autoSaveDelay: 3000,
  splitRatio: 0.5,
};

export function useMarkdownEditor(options: UseMarkdownEditorOptions = {}) {
  const {
    initialContent = '',
    autoSave = true,
    autoSaveDelay = 3000,
    onSave,
    onContentChange,
  } = options;

  const [editorState, setEditorState] = useState<EditorState>({
    content: initialContent,
    viewMode: 'split',
    config: defaultConfig,
    isDirty: false,
    isLoading: false,
    error: null,
    cursorPosition: { line: 1, column: 1 },
  });

  const autoSaveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef(initialContent);

  // 更新内容
  const updateContent = useCallback((newContent: string) => {
    setEditorState(prev => ({
      ...prev,
      content: newContent,
      isDirty: newContent !== lastSavedContentRef.current,
    }));

    // 触发内容变化回调
    onContentChange?.(newContent);

    // 自动保存逻辑
    if (autoSave && onSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(newContent);
      }, autoSaveDelay);
    }
  }, [autoSave, autoSaveDelay, onSave, onContentChange]);

  // 手动保存
  const handleSave = useCallback(async (content?: string) => {
    const contentToSave = content ?? editorState.content;
    
    if (!onSave || contentToSave === lastSavedContentRef.current) {
      return;
    }

    setEditorState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await onSave(contentToSave);
      lastSavedContentRef.current = contentToSave;
      setEditorState(prev => ({
        ...prev,
        isDirty: false,
        isLoading: false,
      }));
    } catch (error) {
      setEditorState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Save failed',
      }));
    }
  }, [editorState.content, onSave]);

  // 更新视图模式
  const setViewMode = useCallback((mode: ViewMode) => {
    setEditorState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // 更新配置
  const updateConfig = useCallback((configUpdate: Partial<EditorConfig>) => {
    setEditorState(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdate },
    }));
  }, []);

  // 更新光标位置
  const updateCursorPosition = useCallback((line: number, column: number) => {
    setEditorState(prev => ({
      ...prev,
      cursorPosition: { line, column },
    }));
  }, []);

  // 插入文本到当前光标位置
  const insertText = useCallback((text: string) => {
    const { content } = editorState;
    const lines = content.split('\n');
    const { line, column } = editorState.cursorPosition;
    
    const currentLine = lines[line - 1] || '';
    const newLine = currentLine.slice(0, column - 1) + text + currentLine.slice(column - 1);
    lines[line - 1] = newLine;
    
    const newContent = lines.join('\n');
    updateContent(newContent);
    
    // 更新光标位置到插入文本后
    updateCursorPosition(line, column + text.length);
  }, [editorState.content, editorState.cursorPosition, updateContent, updateCursorPosition]);

  // 格式化文本（粗体、斜体等）
  const formatText = useCallback((format: 'bold' | 'italic' | 'strikethrough' | 'code') => {
    const formatMap = {
      bold: '**',
      italic: '*',
      strikethrough: '~~',
      code: '`',
    };

    const marker = formatMap[format];
    insertText(`${marker}text${marker}`);
  }, [insertText]);

  // 插入链接
  const insertLink = useCallback((url: string = '', text: string = 'link') => {
    insertText(`[${text}](${url})`);
  }, [insertText]);

  // 插入图片
  const insertImage = useCallback((url: string = '', alt: string = 'image') => {
    insertText(`![${alt}](${url})`);
  }, [insertText]);

  // 插入标题
  const insertHeading = useCallback((level: number) => {
    const prefix = '#'.repeat(Math.max(1, Math.min(6, level)));
    insertText(`${prefix} Heading`);
  }, [insertText]);

  // 插入列表
  const insertList = useCallback((type: 'unordered' | 'ordered') => {
    const marker = type === 'unordered' ? '- ' : '1. ';
    insertText(`${marker}列表项\n${marker}列表项\n${marker}列表项`);
  }, [insertText]);

  // 插入表格
  const insertTable = useCallback(() => {
    const tableTemplate = `| 标题1 | 标题2 | 标题3 |
|-------|-------|-------|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |`;
    insertText(tableTemplate);
  }, [insertText]);

  // 插入代码块
  const insertCodeBlock = useCallback((language: string = 'javascript') => {
    const codeBlockTemplate = `\`\`\`${language}\n// 你的代码\nconsole.log("Hello, World!");\n\`\`\``;
    insertText(codeBlockTemplate);
  }, [insertText]);

  // 插入分隔线
  const insertHorizontalRule = useCallback(() => {
    insertText('\n---\n');
  }, [insertText]);

  // 插入引用
  const insertBlockquote = useCallback(() => {
    insertText('> 这是一个引用文本');
  }, [insertText]);

  // 格式化选中文本或当前行
  const toggleFormat = useCallback((format: 'bold' | 'italic' | 'strikethrough' | 'code') => {
    const { content, cursorPosition } = editorState;
    const lines = content.split('\n');
    const currentLine = lines[cursorPosition.line - 1] || '';
    
    const formatMap = {
      bold: '**',
      italic: '*',
      strikethrough: '~~',
      code: '`',
    };

    const marker = formatMap[format];
    
    // 检查当前行是否已经有该格式
    const hasFormat = currentLine.includes(marker);
    
    if (hasFormat) {
      // 移除格式
      const newLine = currentLine.replace(new RegExp(`\\${marker}(.*?)\\${marker}`, 'g'), '$1');
      lines[cursorPosition.line - 1] = newLine;
      updateContent(lines.join('\n'));
    } else {
      // 添加格式
      insertText(`${marker}text${marker}`);
    }
  }, [editorState, insertText, updateContent]);

  // 获取渲染后的HTML
  const getRenderedHtml = useCallback(() => {
    return parseMarkdown(editorState.content);
  }, [editorState.content]);

  // 获取文档统计信息
  const getDocumentStats = useCallback(() => {
    return calculateDocumentStats(editorState.content);
  }, [editorState.content]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 状态
    editorState,
    
    // 内容操作
    updateContent,
    handleSave,
    
    // 视图控制
    setViewMode,
    updateConfig,
    updateCursorPosition,
    
    // 格式化操作
    insertText,
    formatText,
    toggleFormat,
    insertLink,
    insertImage,
    insertHeading,
    insertList,
    insertTable,
    insertCodeBlock,
    insertHorizontalRule,
    insertBlockquote,
    
    // 工具函数
    getRenderedHtml,
    getDocumentStats,
  };
} 