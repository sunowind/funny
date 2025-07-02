import DOMPurify from 'dompurify';
import { marked } from 'marked';

// 配置 marked 解析器
marked.setOptions({
  breaks: true,
  gfm: true, // GitHub Flavored Markdown
});

// 自定义渲染器
const renderer = new marked.Renderer();

// 自定义标题渲染，添加锚点
renderer.heading = (token) => {
  const text = token.text;
  const level = token.depth;
  const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-'); // 支持中文字符
  return `<h${level} id="${id}">${text}</h${level}>`;
};

// 自定义代码块渲染
renderer.code = (token) => {
  const code = token.text;
  const lang = token.lang || 'text';
  return `<pre class="code-block"><code class="language-${lang}">${code}</code></pre>`;
};

// 自定义表格渲染
renderer.table = (token) => {
  const header = token.header.map(cell => `<th>${cell.text}</th>`).join('');
  const body = token.rows.map(row => 
    `<tr>${row.map(cell => `<td>${cell.text}</td>`).join('')}</tr>`
  ).join('');
  
  return `<div class="table-container">
    <table class="markdown-table">
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
};

// 注意：我们不自定义 list 渲染器，让 marked 使用默认的列表处理
// 这样可以确保普通列表正常工作，只对任务列表进行特殊处理

// 自定义任务列表渲染
renderer.listitem = (token) => {
  const text = token.text;
  // 检查是否是任务列表项
  const isTask = /^\s*\[[x ]\]\s+/.test(text);
  if (isTask) {
    const checked = /^\s*\[x\]\s+/.test(text);
    const content = text.replace(/^\s*\[[x ]\]\s+/, '');
    return `<li class="task-list-item">
      <input type="checkbox" ${checked ? 'checked' : ''} disabled />
      ${content}
    </li>`;
  }
  return `<li>${text}</li>`;
};

marked.use({ renderer });

export interface ParseOptions {
  enableMath?: boolean;
  enableMermaid?: boolean;
  sanitize?: boolean;
}

/**
 * 解析 Markdown 文本为 HTML
 */
export function parseMarkdown(markdown: string, options: ParseOptions = {}): string {
  const { enableMath = true, enableMermaid = true, sanitize = true } = options;

  try {
    let html = marked(markdown) as string;

    // 处理 LaTeX 数学公式
    if (enableMath) {
      html = processMathFormulas(html);
    }

    // 处理 Mermaid 图表
    if (enableMermaid) {
      html = processMermaidDiagrams(html);
    }

    // 清理 HTML，防止 XSS 攻击
    if (sanitize) {
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'strong', 'em', 'u', 's', 'del', 'ins',
          'ul', 'ol', 'li',
          'blockquote',
          'pre', 'code',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'img',
          'div', 'span',
          'input'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'id',
          'type', 'checked', 'disabled',
          'data-*'
        ],
        ALLOW_DATA_ATTR: true
      });
    }

    return html;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return `<p>Error parsing markdown: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
  }
}

/**
 * 处理 LaTeX 数学公式
 */
function processMathFormulas(html: string): string {
  // 行内公式: $...$
  html = html.replace(/\$([^$]+)\$/g, '<span class="math-inline" data-latex="$1">$1</span>');
  
  // 块级公式: $$...$$
  html = html.replace(/\$\$([^$]+)\$\$/g, '<div class="math-block" data-latex="$1">$1</div>');
  
  return html;
}

/**
 * 处理 Mermaid 图表
 */
function processMermaidDiagrams(html: string): string {
  // 查找 mermaid 代码块
  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    '<div class="mermaid-diagram" data-mermaid="$1">$1</div>'
  );
  
  return html;
}

/**
 * 计算文档统计信息
 */
export function calculateDocumentStats(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = content.length;
  const characterCountNoSpaces = content.replace(/\s/g, '').length;
  
  // 估算阅读时间（平均每分钟200字）
  const readingTime = Math.ceil(wordCount / 200);
  
  // 统计段落数
  const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  
  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    readingTime,
    paragraphCount
  };
} 