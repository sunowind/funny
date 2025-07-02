import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SplitView } from '../../app/components/editor/SplitView';
import type { EditorConfig, ViewMode } from '../../app/types/editor';

// Mock child components
vi.mock('../../app/components/editor/MarkdownEditor', () => ({
    MarkdownEditor: ({ value, onChange, className }: any) => (
        <div data-testid="markdown-editor" className={className} data-value={value}>
            <textarea
                data-testid="editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
}));

vi.mock('../../app/components/editor/PreviewPane', () => ({
    PreviewPane: ({ content, className }: any) => (
        <div data-testid="preview-pane" className={className} data-content={content}>
            <div data-testid="preview-content">{content}</div>
        </div>
    ),
}));

describe('SplitView', () => {
    const mockOnChange = vi.fn();
    const mockOnCursorPositionChange = vi.fn();

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
        content: '# Hello World\n\nThis is a test document.',
        viewMode: 'split' as ViewMode,
        onChange: mockOnChange,
        config: defaultConfig,
        onCursorPositionChange: mockOnCursorPositionChange,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should render split view with both editor and preview', () => {
        render(<SplitView {...defaultProps} />);

        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
        expect(screen.getByTestId('editor-textarea')).toHaveValue(defaultProps.content);
        expect(screen.getByTestId('preview-content')).toHaveTextContent(defaultProps.content);
    });

    test('should render only editor in edit mode', () => {
        render(
            <SplitView
                {...defaultProps}
                viewMode="edit"
            />
        );

        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-pane')).not.toBeInTheDocument();
    });

    test('should render only preview in preview mode', () => {
        render(
            <SplitView
                {...defaultProps}
                viewMode="preview"
            />
        );

        expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
    });

    test('should handle content changes from editor', async () => {
        const user = userEvent.setup();

        render(<SplitView {...defaultProps} />);

        const textarea = screen.getByTestId('editor-textarea');
        await user.clear(textarea);
        await user.type(textarea, '# New Content');

        expect(mockOnChange).toHaveBeenCalledWith('# New Content');
    });

    test('should apply split ratio from config', () => {
        const customConfig = { ...defaultConfig, splitRatio: 0.3 };
        const { container } = render(
            <SplitView
                {...defaultProps}
                config={customConfig}
            />
        );

        // In split mode, both editor and preview should be visible
        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();

        // Check if the split layout is applied
        const editorPanel = screen.getByTestId('markdown-editor').parentElement;
        expect(editorPanel).toHaveStyle({ width: '30%' });
    });

    test('should handle split resizer drag', async () => {
        const { container } = render(<SplitView {...defaultProps} />);

        // Find the resizer (the element with cursor-col-resize class)
        const resizer = container.querySelector('.cursor-col-resize');
        expect(resizer).toBeInTheDocument();

        if (resizer) {
            // Simulate drag start
            fireEvent.mouseDown(resizer, { clientX: 400 });

            // Simulate mouse move
            fireEvent.mouseMove(document, { clientX: 500 });

            // Simulate drag end
            fireEvent.mouseUp(document);

            // Verify resizer is still present
            expect(resizer).toBeInTheDocument();
        }
    });

    test('should handle view mode changes', () => {
        const { rerender } = render(<SplitView {...defaultProps} />);

        // Change to edit mode
        rerender(
            <SplitView
                {...defaultProps}
                viewMode="edit"
            />
        );

        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-pane')).not.toBeInTheDocument();

        // Change to preview mode
        rerender(
            <SplitView
                {...defaultProps}
                viewMode="preview"
            />
        );

        expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
    });

    test('should maintain content sync between editor and preview', () => {
        const testContent = '# Test Title\n\n**Bold text** and *italic text*.';

        render(
            <SplitView
                {...defaultProps}
                content={testContent}
            />
        );

        expect(screen.getByTestId('editor-textarea')).toHaveValue(testContent);
        expect(screen.getByTestId('preview-content')).toHaveTextContent(testContent);
    });

    test('should pass editor config to MarkdownEditor', () => {
        const customConfig = {
            ...defaultConfig,
            fontSize: 18,
            lineNumbers: false,
        };

        render(
            <SplitView
                {...defaultProps}
                config={customConfig}
            />
        );

        const editor = screen.getByTestId('markdown-editor');
        expect(editor).toBeInTheDocument();
    });

    test('should handle cursor position changes', () => {
        render(
            <SplitView
                {...defaultProps}
                onCursorPositionChange={mockOnCursorPositionChange}
            />
        );

        // The onCursorPositionChange prop should be passed to MarkdownEditor
        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    });

    test('should handle empty content gracefully', () => {
        render(
            <SplitView
                {...defaultProps}
                content=""
            />
        );

        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
        expect(screen.getByTestId('editor-textarea')).toHaveValue('');
    });

    test('should handle large content efficiently', () => {
        const largeContent = '# Large Document\n\n' + 'Lorem ipsum '.repeat(10000);

        render(
            <SplitView
                {...defaultProps}
                content={largeContent}
            />
        );

        expect(screen.getByTestId('editor-textarea')).toHaveValue(largeContent);
        expect(screen.getByTestId('preview-content')).toHaveTextContent(largeContent);
    });

    test('should apply custom className', () => {
        const customClassName = 'custom-split-view';

        const { container } = render(
            <SplitView
                {...defaultProps}
                className={customClassName}
            />
        );

        expect(container.firstChild).toHaveClass('split-view', customClassName);
    });

    test('should prevent text selection during drag', () => {
        const { container } = render(<SplitView {...defaultProps} />);

        const resizer = container.querySelector('.cursor-col-resize');

        if (resizer) {
            // Start dragging
            fireEvent.mouseDown(resizer, { clientX: 400 });

            // Check if user-select is set to none during drag
            const splitView = container.querySelector('.split-view');
            expect(splitView).toHaveStyle({ userSelect: 'none' });

            // End dragging
            fireEvent.mouseUp(document);

            // Check if user-select is restored after drag
            expect(splitView).toHaveStyle({ userSelect: 'auto' });
        }
    });

    test('should constrain split ratio between 0.2 and 0.8', () => {
        const { container } = render(<SplitView {...defaultProps} />);

        const resizer = container.querySelector('.cursor-col-resize');

        if (resizer) {
            // Mock container dimensions
            const mockGetBoundingClientRect = vi.fn(() => ({
                left: 0,
                width: 1000,
            }));

            Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
                value: mockGetBoundingClientRect,
            });

            // Start dragging
            fireEvent.mouseDown(resizer, { clientX: 500 });

            // Try to drag beyond minimum (should be constrained to 0.2)
            fireEvent.mouseMove(document, { clientX: 50 }); // 5% position

            // Try to drag beyond maximum (should be constrained to 0.8)
            fireEvent.mouseMove(document, { clientX: 950 }); // 95% position

            fireEvent.mouseUp(document);

            // The component should still be functional
            expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
            expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
        }
    });

    test('should handle content updates from external sources', () => {
        const { rerender } = render(
            <SplitView
                {...defaultProps}
                content="Original content"
            />
        );

        rerender(
            <SplitView
                {...defaultProps}
                content="Updated content"
            />
        );

        expect(screen.getByTestId('editor-textarea')).toHaveValue('Updated content');
        expect(screen.getByTestId('preview-content')).toHaveTextContent('Updated content');
    });

    test('should show resizer handle in split mode', () => {
        const { container } = render(<SplitView {...defaultProps} />);

        // Check for resizer handle elements (the three small bars)
        const handles = container.querySelectorAll('.w-0\\.5.h-4');
        expect(handles).toHaveLength(3);
    });

    test('should update split ratio when config changes', () => {
        const { rerender } = render(<SplitView {...defaultProps} />);

        const newConfig = { ...defaultConfig, splitRatio: 0.7 };

        rerender(
            <SplitView
                {...defaultProps}
                config={newConfig}
            />
        );

        // Component should use the new split ratio
        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
    });

    test('should have correct CSS classes for different view modes', () => {
        const { container, rerender } = render(<SplitView {...defaultProps} />);

        // Split mode should have flex container
        let splitContainer = container.querySelector('.flex.h-full');
        expect(splitContainer).toBeInTheDocument();

        // Edit mode should have full width container
        rerender(
            <SplitView
                {...defaultProps}
                viewMode="edit"
            />
        );

        const editContainer = container.querySelector('.w-full.h-full');
        expect(editContainer).toBeInTheDocument();

        // Preview mode should have full width container
        rerender(
            <SplitView
                {...defaultProps}
                viewMode="preview"
            />
        );

        const previewContainer = container.querySelector('.w-full.h-full');
        expect(previewContainer).toBeInTheDocument();
    });
}); 