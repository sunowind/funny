import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EditorConfig, ViewMode } from '../../types/editor';
import { MarkdownEditor, type MarkdownEditorRef } from './MarkdownEditor';
import { PreviewPane } from './PreviewPane';

interface SplitViewProps {
    content: string;
    onChange: (content: string) => void;
    viewMode: ViewMode;
    config: EditorConfig;
    onCursorPositionChange?: (line: number, column: number) => void;
    className?: string;
}

export function SplitView({
    content,
    onChange,
    viewMode,
    config,
    onCursorPositionChange,
    className = '',
}: SplitViewProps) {
    const [splitRatio, setSplitRatio] = useState(config.splitRatio);
    const [isDragging, setIsDragging] = useState(false);
    const [isScrollSyncing, setIsScrollSyncing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<MarkdownEditorRef>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    // 处理分割器拖拽
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    // 处理拖拽移动
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newRatio = (e.clientX - containerRect.left) / containerRect.width;

            // 限制比例在 0.2 到 0.8 之间
            const clampedRatio = Math.max(0.2, Math.min(0.8, newRatio));
            setSplitRatio(clampedRatio);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // 计算滚动位置映射（基于行号）
    const syncScrollPosition = useCallback((sourceScrollRatio: number, targetElement: HTMLElement) => {
        if (isScrollSyncing) return;
        
        setIsScrollSyncing(true);
        
        const targetScrollTop = sourceScrollRatio * (targetElement.scrollHeight - targetElement.clientHeight);
        targetElement.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });

        // 防止滚动事件循环
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrollSyncing(false);
        }, 100);
    }, [isScrollSyncing]);

    // 处理编辑器滚动
    const handleEditorScroll = useCallback(() => {
        if (!editorRef.current || !previewRef.current || isScrollSyncing) return;
        
        const editor = editorRef.current.getEditor();
        if (!editor) return;

        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        
        if (scrollHeight > clientHeight) {
            const scrollRatio = scrollTop / (scrollHeight - clientHeight);
            syncScrollPosition(scrollRatio, previewRef.current);
        }
    }, [syncScrollPosition, isScrollSyncing]);

    // 处理预览面板滚动
    const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (!editorRef.current || isScrollSyncing) return;
        
        const target = e.currentTarget;
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        
        if (scrollHeight > clientHeight) {
            const scrollRatio = scrollTop / (scrollHeight - clientHeight);
            const editor = editorRef.current.getEditor();
            if (editor) {
                const editorScrollHeight = editor.getScrollHeight();
                const editorClientHeight = editor.getLayoutInfo().height;
                const targetScrollTop = scrollRatio * (editorScrollHeight - editorClientHeight);
                
                setIsScrollSyncing(true);
                editor.setScrollTop(Math.max(0, targetScrollTop));
                
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                }
                scrollTimeoutRef.current = setTimeout(() => {
                    setIsScrollSyncing(false);
                }, 100);
            }
        }
    }, [isScrollSyncing]);

    // 监听编辑器滚动事件
    useEffect(() => {
        if (!editorRef.current || viewMode !== 'split') return;
        
        const editor = editorRef.current.getEditor();
        if (!editor) return;

        const disposable = editor.onDidScrollChange(() => {
            handleEditorScroll();
        });

        return () => {
            disposable.dispose();
        };
    }, [handleEditorScroll, viewMode]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // 根据视图模式渲染不同的布局
    const renderContent = () => {
        switch (viewMode) {
            case 'edit':
                return (
                    <div className="w-full h-full">
                        <MarkdownEditor
                            ref={editorRef}
                            value={content}
                            onChange={onChange}
                            config={config}
                            onCursorPositionChange={onCursorPositionChange}
                            className="h-full"
                        />
                    </div>
                );

            case 'preview':
                return (
                    <div className="w-full h-full">
                        <PreviewPane
                            ref={previewRef}
                            content={content}
                            onScroll={handlePreviewScroll}
                            className="h-full"
                        />
                    </div>
                );

            case 'split':
            default:
                return (
                    <div className="flex h-full" ref={containerRef}>
                        {/* 编辑器面板 */}
                        <div
                            className="overflow-hidden"
                            style={{ width: `${splitRatio * 100}%` }}
                        >
                            <MarkdownEditor
                                ref={editorRef}
                                value={content}
                                onChange={onChange}
                                config={config}
                                onCursorPositionChange={onCursorPositionChange}
                                className="h-full"
                            />
                        </div>

                        {/* 分割器 */}
                        <div
                            className={`
                w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize 
                hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors
                ${isDragging ? 'bg-blue-500 dark:bg-blue-400' : ''}
              `}
                            onMouseDown={handleMouseDown}
                        >
                            {/* 分割器手柄 */}
                            <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col space-y-1">
                                    <div className="w-0.5 h-4 bg-gray-400 dark:bg-gray-500"></div>
                                    <div className="w-0.5 h-4 bg-gray-400 dark:bg-gray-500"></div>
                                    <div className="w-0.5 h-4 bg-gray-400 dark:bg-gray-500"></div>
                                </div>
                            </div>
                        </div>

                        {/* 预览面板 */}
                        <div
                            className="overflow-hidden"
                            style={{ width: `${(1 - splitRatio) * 100}%` }}
                        >
                            <PreviewPane
                                ref={previewRef}
                                content={content}
                                onScroll={handlePreviewScroll}
                                className="h-full"
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`split-view h-full ${className}`}>
            {renderContent()}
        </div>
    );
}

// 快捷键映射
export const viewModeShortcuts = {
    'Ctrl+1': 'edit',
    'Ctrl+2': 'split',
    'Ctrl+3': 'preview',
} as const; 