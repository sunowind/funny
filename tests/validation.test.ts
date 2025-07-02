import { describe, expect, it, vi } from 'vitest';
import {
    ApiErrorSchema,
    AuthResponseSchema,
    CreateUserSchema,
    LoginUserSchema,
    UpdateUserSchema,
    UserResponseSchema
} from '../workers/db/schema';
import { parseMarkdown, calculateDocumentStats } from '../app/lib/markdown/parser';
import { mockUsers, testInputs } from './helpers/test-utils';

// Mock DOMPurify
vi.mock('dompurify', () => ({
    default: {
        sanitize: vi.fn((html) => html) // Simple mock that returns input as-is
    }
}));

// Mock marked
vi.mock('marked', () => ({
    marked: vi.fn((content) => `<p>${content}</p>`),
    Renderer: vi.fn(() => ({
        heading: vi.fn(),
        code: vi.fn(),
        table: vi.fn(),
        listitem: vi.fn(),
    }))
}));

describe('Schema Validation', () => {
  describe('CreateUserSchema', () => {
    it('should validate valid user creation data', () => {
      const result = CreateUserSchema.safeParse(testInputs.validRegistration);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testInputs.validRegistration);
      }
    });

    it('should allow optional avatar', () => {
      const { avatar, ...dataWithoutAvatar } = testInputs.validRegistration;
      const result = CreateUserSchema.safeParse(dataWithoutAvatar);
      expect(result.success).toBe(true);
    });

    describe('Username validation', () => {
      it('should reject short username', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.shortUsername);
        expect(result.success).toBe(false);
      });

      it('should reject username with special characters', () => {
        const invalidData = {
          ...testInputs.validRegistration,
          username: 'test@user!'
        };
        const result = CreateUserSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Username can only contain');
        }
      });
    });

    describe('Email validation', () => {
      it('should reject invalid email format', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.invalidEmail);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('Invalid email format');
        }
      });
    });

    describe('Password validation', () => {
      it('should reject short password', () => {
        const result = CreateUserSchema.safeParse(testInputs.invalidInputs.shortPassword);
        expect(result.success).toBe(false);
      });
    });

    describe('Avatar validation', () => {
      it('should reject invalid avatar URL', () => {
        const invalidData = {
          ...testInputs.validRegistration,
          avatar: 'not-a-valid-url'
        };
        const result = CreateUserSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('LoginUserSchema', () => {
    it('should validate valid login data', () => {
      const result = LoginUserSchema.safeParse(testInputs.validLogin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testInputs.validLogin);
      }
    });

    it('should accept email as identifier', () => {
      const validData = {
        identifier: 'test@example.com',
        password: 'password123'
      };
      const result = LoginUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty identifier', () => {
      const result = LoginUserSchema.safeParse(testInputs.invalidInputs.emptyIdentifier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Identifier is required');
      }
    });

    it('should reject empty password', () => {
      const result = LoginUserSchema.safeParse(testInputs.invalidInputs.emptyPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Password is required');
      }
    });
  });

  describe('UpdateUserSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        username: 'newusername',
        email: 'new@example.com'
      };
      const result = UpdateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should allow empty update object', () => {
      const result = UpdateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid username format', () => {
      const invalidData = { username: 'user@invalid' };
      const result = UpdateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Response Schemas', () => {
    describe('UserResponseSchema', () => {
      it('should validate user response data', () => {
        const testUser = {
          id: mockUsers.adminUser.id,
          username: mockUsers.adminUser.username,
          email: mockUsers.adminUser.email,
          avatar: mockUsers.adminUser.avatar,
          createdAt: mockUsers.adminUser.createdAt
        };
        const result = UserResponseSchema.safeParse(testUser);
        expect(result.success).toBe(true);
      });

      it('should allow null avatar', () => {
        const testUser = {
          id: mockUsers.regularUser.id,
          username: mockUsers.regularUser.username,
          email: mockUsers.regularUser.email,
          avatar: undefined,
          createdAt: mockUsers.regularUser.createdAt
        };
        const result = UserResponseSchema.safeParse(testUser);
        expect(result.success).toBe(true);
      });
    });

    describe('AuthResponseSchema', () => {
      it('should validate authentication response', () => {
        const validData = {
          user: {
            id: mockUsers.adminUser.id,
            username: mockUsers.adminUser.username,
            email: mockUsers.adminUser.email,
            avatar: mockUsers.adminUser.avatar,
            createdAt: mockUsers.adminUser.createdAt
          },
          token: 'jwt-token-here'
        };
        const result = AuthResponseSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    describe('ApiErrorSchema', () => {
      it('should validate API error response', () => {
        const validData = {
          error: 'Validation failed',
          message: 'Invalid input data',
          details: { field: 'username', reason: 'too short' }
        };
        const result = ApiErrorSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow minimal error response', () => {
        const validData = {
          error: 'Internal error',
          message: 'Something went wrong'
        };
        const result = ApiErrorSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Markdown Validation', () => {
  describe('Markdown Parsing', () => {
    it('should parse basic markdown correctly', () => {
      const markdown = '# Hello World\n\nThis is **bold** text.';
      const result = parseMarkdown(markdown);
      
      expect(result).toContain('<p># Hello World');
      expect(result).toContain('This is **bold** text.</p>');
    });

    it('should handle empty markdown', () => {
      const result = parseMarkdown('');
      expect(result).toBe('<p></p>');
    });

    it('should handle markdown with special characters', () => {
      const markdown = '# 中文标题\n\n这是**粗体**文本。';
      const result = parseMarkdown(markdown);
      
      expect(result).toContain('中文标题');
      expect(result).toContain('粗体');
    });

    it('should sanitize HTML by default', () => {
      const markdown = '<script>alert("xss")</script>\n\n# Safe Content';
      const result = parseMarkdown(markdown, { sanitize: true });
      
      // Should not contain script tags
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should preserve safe HTML elements', () => {
      const markdown = '# Title\n\n**Bold** and *italic* text.';
      const result = parseMarkdown(markdown);
      
      expect(result).toContain('Title');
      expect(result).toContain('Bold');
      expect(result).toContain('italic');
    });
  });

  describe('Math Formula Validation', () => {
    it('should handle math formulas when enabled', () => {
      const markdown = 'Inline math: $E=mc^2$ and block math: $$\\sum_{i=1}^{n} i$$';
      const result = parseMarkdown(markdown, { enableMath: true });
      
      expect(result).toContain('math-inline');
      expect(result).toContain('math-block');
      expect(result).toContain('data-latex');
    });

    it('should skip math processing when disabled', () => {
      const markdown = 'Math: $E=mc^2$';
      const result = parseMarkdown(markdown, { enableMath: false });
      
      expect(result).not.toContain('math-inline');
      expect(result).toContain('$E=mc^2$');
    });
  });

  describe('Mermaid Diagram Validation', () => {
    it('should process mermaid diagrams when enabled', () => {
      const markdown = '```mermaid\ngraph TD\nA-->B\n```';
      const result = parseMarkdown(markdown, { enableMermaid: true });
      
      expect(result).toContain('mermaid-diagram');
      expect(result).toContain('data-mermaid');
    });

    it('should treat as regular code block when disabled', () => {
      const markdown = '```mermaid\ngraph TD\nA-->B\n```';
      const result = parseMarkdown(markdown, { enableMermaid: false });
      
      expect(result).not.toContain('mermaid-diagram');
      expect(result).toContain('language-mermaid');
    });
  });

  describe('Content Validation', () => {
    it('should reject dangerous script content', () => {
      const dangerousContent = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<a href="javascript:alert(1)">Click</a>',
        '<iframe src="evil.com"></iframe>'
      ];

      dangerousContent.forEach(content => {
        const result = parseMarkdown(content, { sanitize: true });
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('<iframe>');
      });
    });

    it('should preserve safe markdown elements', () => {
      const safeMarkdown = `
# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item 1
- List item 2

[Safe link](https://example.com)

\`\`\`javascript
console.log("Safe code");
\`\`\`

> Blockquote

| Table | Header |
|-------|--------|
| Cell  | Data   |
      `;

      const result = parseMarkdown(safeMarkdown);
      
      expect(result).toContain('Heading 1');
      expect(result).toContain('Bold text');
      expect(result).toContain('List item');
      expect(result).toContain('Safe link');
      expect(result).toContain('console.log');
      expect(result).toContain('Blockquote');
      expect(result).toContain('Table');
    });

    it('should handle task lists correctly', () => {
      const taskList = `
- [x] Completed task
- [ ] Pending task
- [x] Another completed task
      `;

      const result = parseMarkdown(taskList);
      
      expect(result).toContain('task-list-item');
      expect(result).toContain('checked');
      expect(result).toContain('Completed task');
      expect(result).toContain('Pending task');
    });
  });

  describe('Input Length Validation', () => {
    it('should handle very long content', () => {
      const longContent = 'A'.repeat(100000); // 100k characters
      const result = parseMarkdown(longContent);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle content with many lines', () => {
      const manyLines = Array(1000).fill('Line of text').join('\n');
      const result = parseMarkdown(manyLines);
      
      expect(result).toBeDefined();
      expect(result).toContain('Line of text');
    });
  });

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', () => {
      // Mock parsing error
      const originalMarked = vi.mocked(require('marked').marked);
      originalMarked.mockImplementationOnce(() => {
        throw new Error('Parsing failed');
      });

      const result = parseMarkdown('# Test');
      
      expect(result).toContain('Error parsing markdown');
      expect(result).toContain('Parsing failed');
    });

    it('should handle invalid options gracefully', () => {
      const result = parseMarkdown('# Test', { 
        enableMath: true,
        enableMermaid: true,
        sanitize: true
      });
      
      expect(result).toBeDefined();
      expect(result).toContain('Test');
    });
  });
});

describe('Document Statistics Validation', () => {
  describe('calculateDocumentStats', () => {
    it('should calculate word count correctly', () => {
      const content = 'Hello world this is a test document';
      const stats = calculateDocumentStats(content);
      
      expect(stats.wordCount).toBe(7);
    });

    it('should calculate character count correctly', () => {
      const content = 'Hello world!';
      const stats = calculateDocumentStats(content);
      
      expect(stats.characterCount).toBe(12);
    });

    it('should calculate reading time correctly', () => {
      // 200 words should take 1 minute to read
      const words = Array(200).fill('word').join(' ');
      const stats = calculateDocumentStats(words);
      
      expect(stats.readingTime).toBe(1);
    });

    it('should handle empty content', () => {
      const stats = calculateDocumentStats('');
      
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.readingTime).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const stats = calculateDocumentStats('   \n\t  ');
      
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBeGreaterThan(0);
    });

    it('should count Chinese characters correctly', () => {
      const content = '这是一个中文测试文档';
      const stats = calculateDocumentStats(content);
      
      expect(stats.wordCount).toBe(1); // Chinese text is treated as one word
      expect(stats.characterCount).toBe(8);
    });

    it('should handle mixed language content', () => {
      const content = 'Hello 世界 test 测试';
      const stats = calculateDocumentStats(content);
      
      expect(stats.wordCount).toBe(4);
      expect(stats.characterCount).toBe(13);
    });

    it('should count paragraphs correctly', () => {
      const content = `First paragraph.

Second paragraph.

Third paragraph.`;
      const stats = calculateDocumentStats(content);
      
      expect(stats.paragraphCount).toBe(3);
    });
  });
});

describe('Content Security Validation', () => {
  describe('XSS Prevention', () => {
    it('should sanitize script tags', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const result = parseMarkdown(maliciousContent, { sanitize: true });
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should sanitize event handlers', () => {
      const maliciousContent = '<img src="x" onerror="alert(1)" />';
      const result = parseMarkdown(maliciousContent, { sanitize: true });
      
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should sanitize javascript URLs', () => {
      const maliciousContent = '<a href="javascript:alert(1)">Click me</a>';
      const result = parseMarkdown(maliciousContent, { sanitize: true });
      
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should preserve safe attributes', () => {
      const safeContent = '<a href="https://example.com" title="Safe Link">Link</a>';
      const result = parseMarkdown(safeContent, { sanitize: true });
      
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('title="Safe Link"');
    });
  });

  describe('Content Type Validation', () => {
    it('should accept valid markdown content types', () => {
      const validTypes = [
        '# Heading',
        '**Bold**',
        '*Italic*',
        '[Link](url)',
        '![Image](url)',
        '`code`',
        '```\ncode block\n```',
        '> Quote',
        '- List item',
        '1. Numbered item',
        '| Table | Header |'
      ];

      validTypes.forEach(content => {
        const result = parseMarkdown(content);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should handle binary content gracefully', () => {
      const binaryContent = String.fromCharCode(0, 1, 2, 3, 4, 5);
      const result = parseMarkdown(binaryContent);
      
      expect(result).toBeDefined();
    });
  });
}); 