import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { PreviewPane } from '../../app/components/editor/PreviewPane';

describe('PreviewPane', () => {
    it('should render markdown content correctly', () => {
        const content = '# Test Heading\n\nThis is a paragraph with **bold** text.';

        render(<PreviewPane content={content} />);

        // 检查标题是否正确渲染
        expect(screen.getByText(/Test Heading/)).toBeInTheDocument();

        // 检查段落文本是否存在
        expect(screen.getByText(/This is a paragraph/)).toBeInTheDocument();
    });

    it('should render empty content gracefully', () => {
        render(<PreviewPane content="" />);

        // 应该正常渲染空内容
        expect(document.querySelector('.preview-pane')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const customClass = 'custom-preview';

        render(<PreviewPane content="# Test" className={customClass} />);

        const previewElement = document.querySelector('.preview-pane');
        expect(previewElement).toHaveClass(customClass);
    });

    it('should render task lists correctly', () => {
        const content = `
# Task List

- [x] Completed task
- [ ] Incomplete task
    `;

        render(<PreviewPane content={content} />);

        // 检查复选框是否正确渲染
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0]).toBeChecked();
        expect(checkboxes[1]).not.toBeChecked();
    });

    it('should render code blocks correctly', () => {
        const content = '```javascript\nconst hello = "world";\n```';

        render(<PreviewPane content={content} />);

        // 检查代码块是否正确渲染
        expect(screen.getByText(/const hello/)).toBeInTheDocument();
    });

    it('should render tables correctly', () => {
        const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;

        render(<PreviewPane content={content} />);

        // 检查表格是否正确渲染
        expect(screen.getByText('Header 1')).toBeInTheDocument();
        expect(screen.getByText('Header 2')).toBeInTheDocument();
        expect(screen.getByText('Cell 1')).toBeInTheDocument();
        expect(screen.getByText('Cell 2')).toBeInTheDocument();
    });

    it('should handle malformed markdown gracefully', () => {
        const content = '# Incomplete markdown [link without closing';

        render(<PreviewPane content={content} />);

        // 应该仍然渲染内容，即使markdown格式不完整
        expect(screen.getByText(/Incomplete markdown/)).toBeInTheDocument();
    });
}); 