import React from 'react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { ViewMode } from '../../types/editor';

interface EditorToolbarProps {
    // 保存功能
    onSave: () => void;
    isSaving?: boolean;
    
    // 格式化功能
    onFormatText: (format: 'bold' | 'italic' | 'strikethrough' | 'code') => void;
    onInsertLink: () => void;
    onInsertImage: () => void;
    onInsertHeading: (level: number) => void;
    onInsertList: (type: 'unordered' | 'ordered') => void;
    onInsertTable: () => void;
    onInsertCodeBlock: () => void;
    
    // 视图模式
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    
    // 其他操作
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

// 视图模式切换组件
function ViewModeToggle({
    viewMode,
    onViewModeChange
}: {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}) {
    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'edit' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('edit')}
                            className="px-3 py-1 text-xs"
                        >
                            编辑
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>编辑模式 (Ctrl+1)</p>
                    </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'split' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('split')}
                            className="px-3 py-1 text-xs"
                        >
                            分屏
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>分屏模式 (Ctrl+2)</p>
                    </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'preview' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('preview')}
                            className="px-3 py-1 text-xs"
                        >
                            预览
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>预览模式 (Ctrl+3)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

export function EditorToolbar({
    onSave,
    isSaving = false,
    onFormatText,
    onInsertLink,
    onInsertImage,
    onInsertHeading,
    onInsertList,
    onInsertTable,
    onInsertCodeBlock,
    viewMode,
    onViewModeChange,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
}: EditorToolbarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
                <TooltipProvider>
                    {/* 文件操作 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                onClick={onSave} 
                                size="sm"
                                disabled={isSaving}
                                className="px-3"
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>保存文档 (Ctrl+S)</p>
                        </TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6" />

                    {/* 撤销重做 */}
                    {onUndo && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    className="px-3"
                                >
                                    ↶
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>撤销 (Ctrl+Z)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    
                    {onRedo && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRedo}
                                    disabled={!canRedo}
                                    className="px-3"
                                >
                                    ↷
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>重做 (Ctrl+Y)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {(onUndo || onRedo) && <Separator orientation="vertical" className="h-6" />}

                    {/* 文本格式化 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFormatText('bold')}
                                className="px-3 font-bold"
                            >
                                B
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>粗体 (Ctrl+B)</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFormatText('italic')}
                                className="px-3 italic"
                            >
                                I
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>斜体 (Ctrl+I)</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFormatText('strikethrough')}
                                className="px-3 line-through"
                            >
                                S
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>删除线</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onFormatText('code')}
                                className="px-3 font-mono"
                            >
                                &lt;/&gt;
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>行内代码 (Ctrl+`)</p>
                        </TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6" />

                    {/* 标题 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onInsertHeading(1)}
                                className="px-3 font-bold text-lg"
                            >
                                H1
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>一级标题</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onInsertHeading(2)}
                                className="px-3 font-semibold"
                            >
                                H2
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>二级标题</p>
                        </TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6" />

                    {/* 列表 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onInsertList('unordered')}
                                className="px-3"
                            >
                                • 列表
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>无序列表</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onInsertList('ordered')}
                                className="px-3"
                            >
                                1. 列表
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>有序列表</p>
                        </TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6" />

                    {/* 插入内容 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onInsertLink}
                                className="px-3"
                            >
                                🔗 链接
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>插入链接 (Ctrl+K)</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onInsertImage}
                                className="px-3"
                            >
                                🖼️ 图片
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>插入图片</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onInsertTable}
                                className="px-3"
                            >
                                📊 表格
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>插入表格</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onInsertCodeBlock}
                                className="px-3"
                            >
                                {} 代码块
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>插入代码块</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* 右侧：视图模式切换 */}
            <div className="flex items-center space-x-4">
                <ViewModeToggle
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                />
            </div>
        </div>
    );
} 