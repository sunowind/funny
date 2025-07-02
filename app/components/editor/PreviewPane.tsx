import { useEffect, useRef } from 'react';
import { parseMarkdown } from '../../lib/markdown/parser';
import type { PreviewOptions } from '../../types/editor';

interface PreviewPaneProps {
    content: string;
    options?: Partial<PreviewOptions>;
    className?: string;
}

export function PreviewPane({ content, options = {}, className = '' }: PreviewPaneProps) {
    const previewRef = useRef<HTMLDivElement>(null);

    const defaultOptions: PreviewOptions = {
        enableMath: true,
        enableMermaid: true,
        enableToc: false,
        sanitizeHtml: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    // 渲染 Markdown 内容
    const renderMarkdown = () => {
        if (!previewRef.current) return;

        const html = parseMarkdown(content, {
            enableMath: finalOptions.enableMath,
            enableMermaid: finalOptions.enableMermaid,
            sanitize: finalOptions.sanitizeHtml,
        });

        previewRef.current.innerHTML = html;

        // 渲染数学公式
        if (finalOptions.enableMath) {
            renderMathFormulas();
        }

        // 渲染 Mermaid 图表
        if (finalOptions.enableMermaid) {
            renderMermaidDiagrams();
        }
    };

    // 渲染数学公式
    const renderMathFormulas = async () => {
        if (!previewRef.current) return;

        try {
            // 动态导入 KaTeX
            const katex = await import('katex');

            // 渲染行内公式
            const inlineMath = previewRef.current.querySelectorAll('.math-inline');
            inlineMath.forEach((element) => {
                const latex = element.getAttribute('data-latex');
                if (latex) {
                    try {
                        katex.render(latex, element as HTMLElement, {
                            displayMode: false,
                            throwOnError: false,
                        });
                    } catch (error) {
                        console.warn('KaTeX render error:', error);
                        element.textContent = latex;
                    }
                }
            });

            // 渲染块级公式
            const blockMath = previewRef.current.querySelectorAll('.math-block');
            blockMath.forEach((element) => {
                const latex = element.getAttribute('data-latex');
                if (latex) {
                    try {
                        katex.render(latex, element as HTMLElement, {
                            displayMode: true,
                            throwOnError: false,
                        });
                    } catch (error) {
                        console.warn('KaTeX render error:', error);
                        element.textContent = latex;
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to load KaTeX:', error);
        }
    };

    // 渲染 Mermaid 图表
    const renderMermaidDiagrams = async () => {
        if (!previewRef.current) return;

        try {
            // 动态导入 Mermaid
            const mermaid = await import('mermaid');

            // 初始化 Mermaid
            mermaid.default.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
            });

            const diagrams = previewRef.current.querySelectorAll('.mermaid-diagram');

            diagrams.forEach(async (element, index) => {
                const diagramText = element.getAttribute('data-mermaid');
                if (diagramText) {
                    try {
                        const { svg } = await mermaid.default.render(`mermaid-${index}`, diagramText);
                        element.innerHTML = svg;
                    } catch (error) {
                        console.warn('Mermaid render error:', error);
                        element.innerHTML = `<pre>${diagramText}</pre>`;
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to load Mermaid:', error);
        }
    };

    // 当内容或选项变化时重新渲染
    useEffect(() => {
        renderMarkdown();
    }, [content, finalOptions]);

    // 添加点击链接处理
    useEffect(() => {
        if (!previewRef.current) return;

        const handleLinkClick = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href && href.startsWith('#')) {
                    // 内部锚点链接
                    event.preventDefault();
                    const targetElement = document.getElementById(href.slice(1));
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (href && !href.startsWith('http')) {
                    // 相对链接，阻止默认行为
                    event.preventDefault();
                    console.log('Relative link clicked:', href);
                }
            }
        };

        previewRef.current.addEventListener('click', handleLinkClick);

        return () => {
            previewRef.current?.removeEventListener('click', handleLinkClick);
        };
    }, []);

    return (
        <div className={`preview-pane h-full overflow-auto bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}>
            <div
                ref={previewRef}
                className="markdown-content p-6"
                style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: '#374151',
                }}
            />

            {/* 加载 KaTeX CSS */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
                integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
                crossOrigin="anonymous"
            />

            <style>{`
                .markdown-content h1, .markdown-content h2, .markdown-content h3,
                .markdown-content h4, .markdown-content h5, .markdown-content h6 {
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                    color: #1f2937;
                    position: relative;
                }
                
                /* 隐藏任何可能的锚点符号 */
                .markdown-content .anchor {
                    display: none;
                }
                
                .markdown-content h1 { 
                    font-size: 2em; 
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 0.3em;
                }
                .markdown-content h2 { 
                    font-size: 1.5em;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 0.3em; 
                }
                .markdown-content h3 { font-size: 1.25em; }
                .markdown-content h4 { font-size: 1.1em; }
                .markdown-content h5 { font-size: 1em; }
                .markdown-content h6 { font-size: 0.9em; }
                
                .markdown-content p {
                    margin-bottom: 1em;
                    color: #374151;
                }
                
                .markdown-content ul, .markdown-content ol {
                    margin-bottom: 1em;
                    padding-left: 1.5em;
                }
                
                .markdown-content li {
                    margin-bottom: 0.25em;
                    color: #374151;
                }
                
                .markdown-content strong {
                    font-weight: 600;
                    color: #111827;
                }
                
                .markdown-content em {
                    font-style: italic;
                }
                
                .markdown-content code {
                    background-color: #f3f4f6;
                    color: #dc2626;
                    padding: 0.125em 0.25em;
                    border-radius: 0.25em;
                    font-size: 0.875em;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                }
                
                .markdown-content pre {
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5em;
                    padding: 1em;
                    margin: 1em 0;
                    overflow-x: auto;
                }
                
                .markdown-content pre code {
                    background-color: transparent;
                    color: #374151;
                    padding: 0;
                }
                
                .markdown-content blockquote {
                    border-left: 4px solid #e5e7eb;
                    padding-left: 1em;
                    margin: 1em 0;
                    font-style: italic;
                    color: #6b7280;
                }
                
                .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1em 0;
                }
                
                .markdown-content th, .markdown-content td {
                    border: 1px solid #e5e7eb;
                    padding: 0.5em;
                    text-align: left;
                }
                
                .markdown-content th {
                    background-color: #f9fafb;
                    font-weight: 600;
                    color: #111827;
                }
                
                .markdown-content td {
                    color: #374151;
                }
                
                .markdown-content .task-list-item {
                    list-style: none;
                    margin-left: -1.5em;
                    padding-left: 1.5em;
                }
                
                .markdown-content .task-list-item input {
                    margin-right: 0.5em;
                }
                
                .markdown-content a {
                    color: #3b82f6;
                    text-decoration: underline;
                }
                
                .markdown-content a:hover {
                    color: #1d4ed8;
                }
                
                .markdown-content hr {
                    border: none;
                    border-top: 1px solid #e5e7eb;
                    margin: 2em 0;
                }
                
                /* Dark mode styles */
                .dark .markdown-content h1, .dark .markdown-content h2, .dark .markdown-content h3,
                .dark .markdown-content h4, .dark .markdown-content h5, .dark .markdown-content h6 {
                    color: #f9fafb;
                }
                
                .dark .markdown-content h1, .dark .markdown-content h2 {
                    border-bottom-color: #374151;
                }
                
                .dark .markdown-content p, .dark .markdown-content li, .dark .markdown-content td {
                    color: #d1d5db;
                }
                
                .dark .markdown-content strong {
                    color: #f9fafb;
                }
                
                .dark .markdown-content code {
                    background-color: #374151;
                    color: #fca5a5;
                }
                
                .dark .markdown-content pre {
                    background-color: #1f2937;
                    border-color: #374151;
                }
                
                .dark .markdown-content pre code {
                    color: #d1d5db;
                }
                
                .dark .markdown-content blockquote {
                    border-left-color: #374151;
                    color: #9ca3af;
                }
                
                .dark .markdown-content th, .dark .markdown-content td {
                    border-color: #374151;
                }
                
                .dark .markdown-content th {
                    background-color: #374151;
                    color: #f9fafb;
                }
                
                .dark .markdown-content a {
                    color: #60a5fa;
                }
                
                .dark .markdown-content a:hover {
                    color: #93c5fd;
                }
                
                .dark .markdown-content hr {
                    border-top-color: #374151;
                }
            `}</style>
        </div>
    );
} 