import { useEffect, useRef } from 'react';

/**
 * Shared hook for managing modal focus according to WCAG guidelines.
 *
 * - Focuses the close button when modal opens
 * - Returns focus to the trigger element when modal closes
 *
 * @param isOpen - Whether the modal is currently open
 * @param closeButtonRef - Ref to the close button element
 * @param triggerRef - Optional ref to the element that triggered the modal
 */
export function useModalFocus(
  isOpen: boolean,
  closeButtonRef: React.RefObject<HTMLElement>,
  triggerRef?: React.RefObject<HTMLElement>
) {
  const wasOpenRef = useRef(false);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen, closeButtonRef]);

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

    // Cleanup: return focus when component unmounts (for modals that don't use isOpen prop)
    return () => {
      if (wasOpenRef.current && triggerRef?.current) {
        // Use setTimeout to ensure the modal is fully unmounted before focusing
        setTimeout(() => {
          triggerRef.current?.focus();
        }, 0);
      }
    };
  }, [isOpen, triggerRef]);
}

