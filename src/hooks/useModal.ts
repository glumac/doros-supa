import { useEffect, useRef, useCallback } from 'react';

/**
 * Comprehensive modal hook that handles:
 * - Focus management (focuses close/confirm button on open, returns focus to trigger on close)
 * - Escape key to close
 * - Body scroll lock
 * - Overlay click to close
 *
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Callback to close the modal
 * @param focusRef - Ref to the element to focus when modal opens (e.g., close button)
 * @param triggerRef - Optional ref to the element that triggered the modal (for focus return)
 */
export function useModal(
  isOpen: boolean,
  onClose: () => void,
  focusRef: React.RefObject<HTMLElement>,
  triggerRef?: React.RefObject<HTMLElement>
) {
  const wasOpenRef = useRef(false);

  // Focus the target element when modal opens
  useEffect(() => {
    if (isOpen && focusRef.current) {
      focusRef.current.focus();
    }
  }, [isOpen, focusRef]);

  // Return focus to trigger when modal closes
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      // Modal was open and is now closed - return focus to trigger
      wasOpenRef.current = false;
      if (triggerRef?.current) {
        // Use setTimeout to ensure the modal is fully closed before focusing
        setTimeout(() => {
          triggerRef.current?.focus();
        }, 0);
      }
    }

    // Cleanup: return focus when component unmounts
    return () => {
      if (wasOpenRef.current && triggerRef?.current) {
        setTimeout(() => {
          triggerRef.current?.focus();
        }, 0);
      }
    };
  }, [isOpen, triggerRef]);

  // Escape key handler and scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Overlay click handler (returns a function to use on the overlay div)
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return { handleOverlayClick };
}



