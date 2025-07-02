import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the useAutoSave hook since it doesn't exist yet
// We'll create a mock implementation for testing purposes
interface UseAutoSaveOptions {
  delay?: number;
  onSave: (content: string) => Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  save: (content: string) => void;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  clearError: () => void;
  forceSave: (content: string) => Promise<void>;
}

// Mock implementation for testing
const createMockUseAutoSave = () => {
  let state = {
    isAutoSaving: false,
    lastSaved: null as Date | null,
    error: null as Error | null,
    saveTimer: null as NodeJS.Timeout | null,
  };
  
  const useAutoSave = (options: UseAutoSaveOptions): UseAutoSaveReturn => {
    const { delay = 3000, onSave, onError, enabled = true } = options;
    
    const save = (content: string) => {
      if (!enabled) return;
      
      // Clear existing timer
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
      }
      
      // Set new timer for debounced save
      state.saveTimer = setTimeout(async () => {
        try {
          state.isAutoSaving = true;
          await onSave(content);
          state.lastSaved = new Date();
          state.error = null;
        } catch (err) {
          state.error = err as Error;
          onError?.(err as Error);
        } finally {
          state.isAutoSaving = false;
        }
      }, delay);
    };
    
    const forceSave = async (content: string) => {
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
        state.saveTimer = null;
      }
      
      try {
        state.isAutoSaving = true;
        await onSave(content);
        state.lastSaved = new Date();
        state.error = null;
      } catch (err) {
        state.error = err as Error;
        onError?.(err as Error);
        throw err;
      } finally {
        state.isAutoSaving = false;
      }
    };
    
    const clearError = () => {
      state.error = null;
    };
    
    return {
      save,
      isAutoSaving: state.isAutoSaving,
      lastSaved: state.lastSaved,
      error: state.error,
      clearError,
      forceSave,
    };
  };
  
  // Reset state function for testing
  const resetState = () => {
    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
    }
    state = {
      isAutoSaving: false,
      lastSaved: null,
      error: null,
      saveTimer: null,
    };
  };
  
  return { useAutoSave, resetState };
};

describe('useAutoSave', () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  let useAutoSave: ReturnType<typeof createMockUseAutoSave>['useAutoSave'];
  let resetState: ReturnType<typeof createMockUseAutoSave>['resetState'];

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnSave = vi.fn().mockResolvedValue(undefined);
    mockOnError = vi.fn();
    const mock = createMockUseAutoSave();
    useAutoSave = mock.useAutoSave;
    resetState = mock.resetState;
    resetState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetState();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
      })
    );

    expect(result.current.isAutoSaving).toBe(false);
    expect(result.current.lastSaved).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.save).toBe('function');
    expect(typeof result.current.forceSave).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  test('should trigger save after default delay', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast-forward past the default delay (3000ms)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnSave).toHaveBeenCalledWith('test content');
  });

  test('should trigger save after custom delay', async () => {
    const customDelay = 1000;
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: customDelay,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    // Should not save before custom delay
    await act(async () => {
      vi.advanceTimersByTime(customDelay - 100);
    });

    expect(mockOnSave).not.toHaveBeenCalled();

    // Should save after custom delay
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnSave).toHaveBeenCalledWith('test content');
  });

  test('should debounce rapid changes', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 1000,
      })
    );

    // Trigger multiple saves rapidly
    act(() => {
      result.current.save('content 1');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save('content 2');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save('content 3');
    });

    // Should not have saved yet
    expect(mockOnSave).not.toHaveBeenCalled();

    // Advance timer to complete the last save
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('content 3');
  });

  test('should handle save errors gracefully', async () => {
    const saveError = new Error('Save failed');
    mockOnSave.mockRejectedValue(saveError);

    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        onError: mockOnError,
        delay: 100,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnError).toHaveBeenCalledWith(saveError);
    expect(result.current.error).toBe(saveError);
  });

  test('should clear error when clearError is called', async () => {
    const saveError = new Error('Save failed');
    mockOnSave.mockRejectedValue(saveError);

    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 100,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.error).toBeInstanceOf(Error);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  test('should force save immediately without debounce', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 3000,
      })
    );

    // Start a debounced save
    act(() => {
      result.current.save('debounced content');
    });

    // Force save immediately
    await act(async () => {
      await result.current.forceSave('forced content');
    });

    expect(mockOnSave).toHaveBeenCalledWith('forced content');
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    // Original debounced save should not trigger
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  test('should throw error on force save failure', async () => {
    const saveError = new Error('Force save failed');
    mockOnSave.mockRejectedValue(saveError);

    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    await act(async () => {
      await expect(result.current.forceSave('test content')).rejects.toThrow(saveError);
    });

    expect(mockOnError).toHaveBeenCalledWith(saveError);
    expect(result.current.error).toBe(saveError);
  });

  test('should not save when disabled', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        enabled: false,
        delay: 100,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('should handle rapid enable/disable changes', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useAutoSave({
          onSave: mockOnSave,
          enabled,
          delay: 100,
        }),
      { initialProps: { enabled: true } }
    );

    // Save while enabled
    act(() => {
      result.current.save('content 1');
    });

    // Disable before save triggers
    rerender({ enabled: false });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnSave).not.toHaveBeenCalled();

    // Re-enable and save again
    rerender({ enabled: true });

    act(() => {
      result.current.save('content 2');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnSave).toHaveBeenCalledWith('content 2');
  });

  test('should update lastSaved timestamp on successful save', async () => {
    const mockDate = new Date('2023-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 100,
      })
    );

    expect(result.current.lastSaved).toBe(null);

    act(() => {
      result.current.save('test content');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.lastSaved).toEqual(mockDate);
  });

  test('should not update lastSaved on save error', async () => {
    mockOnSave.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 100,
      })
    );

    act(() => {
      result.current.save('test content');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.lastSaved).toBe(null);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  test('should handle multiple save attempts with different content', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 500,
      })
    );

    // First save
    act(() => {
      result.current.save('content 1');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnSave).toHaveBeenCalledWith('content 1');
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    // Second save after some time
    act(() => {
      result.current.save('content 2');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnSave).toHaveBeenCalledWith('content 2');
    expect(mockOnSave).toHaveBeenCalledTimes(2);
  });

  test('should handle empty content', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        delay: 100,
      })
    );

    act(() => {
      result.current.save('');
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnSave).toHaveBeenCalledWith('');
  });
}); 