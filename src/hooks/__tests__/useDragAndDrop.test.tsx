import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from '../useDragAndDrop';

describe('useDragAndDrop', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns isDragging as false initially', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      expect(result.current.isDragging).toBe(false);
    });

    it('returns drag event handlers', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      expect(typeof result.current.onDragEnter).toBe('function');
      expect(typeof result.current.onDragOver).toBe('function');
      expect(typeof result.current.onDragLeave).toBe('function');
      expect(typeof result.current.onDrop).toBe('function');
      expect(typeof result.current.onKeyDown).toBe('function');
    });

    it('returns ARIA attributes', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      expect(result.current.ariaProps).toBeDefined();
      expect(result.current.ariaProps['aria-label']).toBeTruthy();
    });
  });

  describe('drag enter', () => {
    it('sets isDragging to true when valid file is dragged', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        items: [{ kind: 'file', type: 'image/png' }],
        files: [mockFile],
      };

      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(true);
    });

    it('does not set isDragging when no files are dragged', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockDataTransfer = {
        items: [],
        files: [],
      };

      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('prevents default behavior', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const preventDefault = vi.fn();
      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        items: [{ kind: 'file', type: 'image/png' }],
        files: [mockFile],
      };

      act(() => {
        result.current.onDragEnter({
          preventDefault,
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('drag over', () => {
    it('prevents default behavior', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const preventDefault = vi.fn();

      act(() => {
        result.current.onDragOver({
          preventDefault,
          stopPropagation: vi.fn(),
        } as any);
      });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('drag leave', () => {
    it('sets isDragging to false when drag counter reaches 0', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        items: [{ kind: 'file', type: 'image/png' }],
        files: [mockFile],
      };

      // Enter first
      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(true);

      // Leave
      act(() => {
        result.current.onDragLeave({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as any);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('prevents default behavior', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const preventDefault = vi.fn();

      act(() => {
        result.current.onDragLeave({
          preventDefault,
          stopPropagation: vi.fn(),
        } as any);
      });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('drop', () => {
    it('calls onFileSelect with valid file', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File(['x'.repeat(1000)], 'test.png', {
        type: 'image/png',
      });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('uses first file when multiple files are dropped', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile1 = new File(['x'.repeat(1000)], 'test1.png', {
        type: 'image/png',
      });
      const mockFile2 = new File(['x'.repeat(1000)], 'test2.jpg', {
        type: 'image/jpeg',
      });
      const mockDataTransfer = {
        files: [mockFile1, mockFile2],
        items: [
          { kind: 'file', type: 'image/png' },
          { kind: 'file', type: 'image/jpeg' },
        ],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile1);
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onError for invalid file type', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/svg+xml' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnError.mock.calls[0][0]).toContain('not supported');
    });

    it('calls onError for file over size limit', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File(
        ['x'.repeat(5242881)], // Over 5MB
        'test.jpg',
        { type: 'image/jpeg' }
      );
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/jpeg' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnError.mock.calls[0][0]).toContain('too large');
    });

    it('rejects non-file content (folders, text)', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockDataTransfer = {
        files: [],
        items: [{ kind: 'string', type: 'text/plain' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnError.mock.calls[0][0]).toContain('image file');
    });

    it('resets isDragging after drop', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File(['x'.repeat(1000)], 'test.png', {
        type: 'image/png',
      });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      // Enter first
      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(true);

      // Drop
      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('prevents default and stops propagation', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const mockFile = new File(['x'.repeat(1000)], 'test.png', {
        type: 'image/png',
      });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault,
          stopPropagation,
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });
  });

  describe('keyboard accessibility', () => {
    it('calls onFileSelect when Enter is pressed', () => {
      const mockFileInputRef = { current: { click: vi.fn() } };
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          fileInputRef: mockFileInputRef as any,
        })
      );

      act(() => {
        result.current.onKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as any);
      });

      expect(mockFileInputRef.current.click).toHaveBeenCalled();
    });

    it('calls onFileSelect when Space is pressed', () => {
      const mockFileInputRef = { current: { click: vi.fn() } };
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          fileInputRef: mockFileInputRef as any,
        })
      );

      act(() => {
        result.current.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as any);
      });

      expect(mockFileInputRef.current.click).toHaveBeenCalled();
    });

    it('prevents default for Enter and Space', () => {
      const mockFileInputRef = { current: { click: vi.fn() } };
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          fileInputRef: mockFileInputRef as any,
        })
      );

      const preventDefault = vi.fn();

      act(() => {
        result.current.onKeyDown({
          key: 'Enter',
          preventDefault,
        } as any);
      });

      expect(preventDefault).toHaveBeenCalled();
    });

    it('does nothing for other keys', () => {
      const mockFileInputRef = { current: { click: vi.fn() } };
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          fileInputRef: mockFileInputRef as any,
        })
      );

      act(() => {
        result.current.onKeyDown({
          key: 'Tab',
          preventDefault: vi.fn(),
        } as any);
      });

      expect(mockFileInputRef.current.click).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('does not set isDragging when disabled', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          disabled: true,
        })
      );

      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        items: [{ kind: 'file', type: 'image/png' }],
        files: [mockFile],
      };

      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('does not call onFileSelect when disabled', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          disabled: true,
        })
      );

      const mockFile = new File(['x'.repeat(1000)], 'test.png', {
        type: 'image/png',
      });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      act(() => {
        result.current.onDrop({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('sets aria-busy when disabled', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
          disabled: true,
        })
      );

      expect(result.current.ariaProps['aria-busy']).toBe(true);
    });
  });

  describe('drag counter pattern', () => {
    it('handles nested drag enter/leave correctly', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onFileSelect: mockOnFileSelect,
          onError: mockOnError,
        })
      );

      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        items: [{ kind: 'file', type: 'image/png' }],
        files: [mockFile],
      };

      // Enter parent
      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });
      expect(result.current.isDragging).toBe(true);

      // Enter child (should not change state)
      act(() => {
        result.current.onDragEnter({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: mockDataTransfer as any,
        } as any);
      });
      expect(result.current.isDragging).toBe(true);

      // Leave child (should not change state)
      act(() => {
        result.current.onDragLeave({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as any);
      });
      expect(result.current.isDragging).toBe(true);

      // Leave parent (should reset)
      act(() => {
        result.current.onDragLeave({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as any);
      });
      expect(result.current.isDragging).toBe(false);
    });
  });
});

