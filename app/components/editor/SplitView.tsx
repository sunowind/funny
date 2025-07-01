import React, { useEffect, useRef, useState } from 'react';
import type { EditorConfig, ViewMode } from '../../types/editor';
import { MarkdownEditor } from './MarkdownEditor';
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
    const containerRef = useRef<HTMLDivElement>(null);

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

    // 根据视图模式渲染不同的布局
    const renderContent = () => {
        switch (viewMode) {
            case 'edit':
                return (
                    <div className="w-full h-full">
                        <MarkdownEditor
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
                            content={content}
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
                                content={content}
                                className="h-full"
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div
            className={`split-view ${className}`}
            style={{
                height: '100%',
                userSelect: isDragging ? 'none' : 'auto',
            }}
        >
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