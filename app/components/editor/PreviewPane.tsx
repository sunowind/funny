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
        <div className={`preview-pane prose prose-lg max-w-none p-6 overflow-auto bg-white border-l border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${className}`}>
            <div
                ref={previewRef}
                className="markdown-content"
                style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
            />

            {/* 加载 KaTeX CSS */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
                integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
                crossOrigin="anonymous"
            />
        </div>
    );
} 