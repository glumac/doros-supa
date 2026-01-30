import { useState, useRef, useCallback } from 'react';
import { validateImageFile, convertHeicIfNeeded } from '../lib/imageValidation';

interface UseDragAndDropProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

interface DragAndDropReturn {
  isDragging: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ariaProps: {
    'aria-label': string;
    'aria-describedby'?: string;
    'aria-busy'?: boolean;
    role: string;
    tabIndex: number;
  };
}

/**
 * Hook for accessible drag-and-drop file upload
 * Handles drag events, file validation, and keyboard accessibility
 */
export function useDragAndDrop({
  onFileSelect,
  onError,
  fileInputRef,
  disabled = false,
}: UseDragAndDropProps): DragAndDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounterRef.current++;

      // Check if dragging files (not folders or text)
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        const hasFiles = Array.from(e.dataTransfer.items).some(
          (item) => item.kind === 'file'
        );
        if (hasFiles) {
          setIsDragging(true);
        }
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounterRef.current--;

      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        onError('Please drop an image file, not a folder or other content.');
        return;
      }

      // Use first file only
      const file = files[0];
      if (!file) {
        onError('Please drop an image file, not a folder or other content.');
        return;
      }

      // Check if it's actually a file (not a folder)
      if (file.size === 0 && file.type === '') {
        onError('Please drop an image file, not a folder or other content.');
        return;
      }

      try {
        // Convert HEIC to JPEG if needed (before validation)
        const processedFile = await convertHeicIfNeeded(file);

        // Validate file after conversion
        const validation = validateImageFile(processedFile);
        if (!validation.valid) {
          onError(validation.error || 'Invalid file');
          return;
        }

        // File is valid, call callback
        onFileSelect(processedFile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
        onError(errorMessage);
      }
    },
    [disabled, onFileSelect, onError]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInputRef?.current) {
          fileInputRef.current.click();
        }
      }
    },
    [disabled, fileInputRef]
  );

  const ariaProps = {
    'aria-label': 'Image upload area. Drag and drop an image or click to select',
    role: 'button' as const,
    tabIndex: disabled ? -1 : 0,
    ...(disabled && { 'aria-busy': true }),
  };

  return {
    isDragging,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onKeyDown: handleKeyDown,
    ariaProps,
  };
}

