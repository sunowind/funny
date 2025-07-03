import DOMPurify from 'dompurify';
import { marked } from 'marked';

// 添加缓存机制
const parseCache = new Map<string, string>();
const CACHE_SIZE_LIMIT = 100; // 最多缓存100个结果

// 缓存管理
function getCachedResult(content: string, options: ParseOptions): string | null {
  const cacheKey = `${content}-${JSON.stringify(options)}`;
  return parseCache.get(cacheKey) || null;
}

function setCachedResult(content: string, options: ParseOptions, result: string): void {
  const cacheKey = `${content}-${JSON.stringify(options)}`;
  
  // 如果缓存太大，清除最老的条目
  if (parseCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey) {
      parseCache.delete(firstKey);
    }
  }
  
  parseCache.set(cacheKey, result);
}

// 配置 marked 解析器
marked.setOptions({
  breaks: true,
  gfm: true, // GitHub Flavored Markdown
});

// 自定义渲染器 - 在测试环境下使用 mock 对象
let renderer: any;
try {
  renderer = new marked.Renderer();
} catch (error) {
  // 测试环境下的 fallback
  renderer = {
    heading: () => '',
    code: () => '',
    table: () => '',
    listitem: () => ''
  };
}

// 自定义标题渲染，添加锚点
renderer.heading = (token: any) => {
  const text = token.text;
  const level = token.depth;
  const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-'); // 支持中文字符
  return `<h${level} id="${id}">${text}</h${level}>`;
};

// 自定义代码块渲染
renderer.code = (token: any) => {
  const code = token.text;
  const lang = token.lang || 'text';
  return `<pre class="code-block"><code class="language-${lang}">${code}</code></pre>`;
};

// 自定义表格渲染
renderer.table = (token: any) => {
  const header = token.header.map((cell: any) => `<th>${cell.text}</th>`).join('');
  const body = token.rows.map((row: any) => 
    `<tr>${row.map((cell: any) => `<td>${cell.text}</td>`).join('')}</tr>`
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
renderer.listitem = (token: any) => {
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

try {
  marked.use({ renderer });
} catch (error) {
  // 在测试环境下忽略 use 错误
  console.warn('marked.use failed in test environment:', error);
}

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

  // 检查缓存
  const cachedResult = getCachedResult(markdown, options);
  if (cachedResult) {
    return cachedResult;
  }

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

    // 缓存结果
    setCachedResult(markdown, options, html);

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
 * 计算文档统计信息（优化版本）
 */
export function calculateDocumentStats(content: string) {
  if (!content.trim()) {
    return {
      wordCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      readingTime: 0,
      paragraphCount: 0
    };
  }

  // 使用更高效的字符串操作
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]*`/g, '') // 移除行内代码
    .replace(/#{1,6}\s/g, '') // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1'); // 移除图片，保留alt文本
  
  // 优化的字数统计
  const characterCount = content.length;
  const characterCountNoSpaces = content.replace(/\s/g, '').length;
  
  // 中英文混合字数统计
  const chineseChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (cleanContent.match(/[a-zA-Z]+/g) || []).length;
  const wordCount = chineseChars + englishWords;
  
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

/**
 * 清除解析缓存
 */
export function clearParseCache(): void {
  parseCache.clear();
} 