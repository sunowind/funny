import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarkdownEditor } from '../../app/hooks/useMarkdownEditor';

describe('useMarkdownEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    expect(result.current.editorState.content).toBe('');
    expect(result.current.editorState.viewMode).toBe('split');
    expect(result.current.editorState.isDirty).toBe(false);
    expect(result.current.editorState.isLoading).toBe(false);
    expect(result.current.editorState.error).toBe(null);
  });

  it('should initialize with custom initial content', () => {
    const initialContent = '# Test Content';
    const { result } = renderHook(() => 
      useMarkdownEditor({ initialContent })
    );
    
    expect(result.current.editorState.content).toBe(initialContent);
  });

  it('should update content and mark as dirty', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.updateContent('New content');
    });
    
    expect(result.current.editorState.content).toBe('New content');
    expect(result.current.editorState.isDirty).toBe(true);
  });

  it('should change view mode', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.setViewMode('preview');
    });
    
    expect(result.current.editorState.viewMode).toBe('preview');
  });

  it('should update cursor position', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.updateCursorPosition(5, 10);
    });
    
    expect(result.current.editorState.cursorPosition.line).toBe(5);
    expect(result.current.editorState.cursorPosition.column).toBe(10);
  });

  it('should format text with bold', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.formatText('bold');
    });
    
    expect(result.current.editorState.content).toBe('**text**');
  });

  it('should format text with italic', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.formatText('italic');
    });
    
    expect(result.current.editorState.content).toBe('*text*');
  });

  it('should insert link', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.insertLink('https://example.com', 'Example');
    });
    
    expect(result.current.editorState.content).toBe('[Example](https://example.com)');
  });

  it('should insert image', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.insertImage('image.jpg', 'Test Image');
    });
    
    expect(result.current.editorState.content).toBe('![Test Image](image.jpg)');
  });

  it('should insert heading', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.insertHeading(2);
    });
    
    expect(result.current.editorState.content).toBe('## Heading');
  });

  it('should trigger auto save after delay', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useMarkdownEditor({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave: mockSave 
      })
    );
    
    act(() => {
      result.current.updateContent('New content');
    });
    
    // 快进时间到自动保存延迟
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(mockSave).toHaveBeenCalledWith('New content');
  });

  it('should call content change callback', () => {
    const mockOnContentChange = vi.fn();
    const { result } = renderHook(() => 
      useMarkdownEditor({ onContentChange: mockOnContentChange })
    );
    
    act(() => {
      result.current.updateContent('New content');
    });
    
    expect(mockOnContentChange).toHaveBeenCalledWith('New content');
  });

  it('should handle save errors', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => 
      useMarkdownEditor({ onSave: mockSave })
    );
    
    // 需要先添加一些内容使其变为dirty状态
    act(() => {
      result.current.updateContent('Some content');
    });

    await act(async () => {
      await result.current.handleSave();
    });
    
    expect(result.current.editorState.error).toBe('Save failed');
    expect(result.current.editorState.isLoading).toBe(false);
  });

  it('should calculate document stats', () => {
    const content = 'This is a test document with multiple words.';
    const { result } = renderHook(() => 
      useMarkdownEditor({ initialContent: content })
    );
    
    const stats = result.current.getDocumentStats();
    
    expect(stats.wordCount).toBeGreaterThan(0);
    expect(stats.characterCount).toBe(content.length);
    expect(stats.readingTime).toBeGreaterThan(0);
  });

  it('should update editor config', () => {
    const { result } = renderHook(() => useMarkdownEditor());
    
    act(() => {
      result.current.updateConfig({ fontSize: 16, theme: 'dark' });
    });
    
    expect(result.current.editorState.config.fontSize).toBe(16);
    expect(result.current.editorState.config.theme).toBe('dark');
  });
}); 