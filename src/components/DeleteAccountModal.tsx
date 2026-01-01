import { useState, useEffect, useRef } from 'react';
import { useModal } from '../hooks/useModal';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useAuth } from '../contexts/AuthContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  triggerRef?: React.RefObject<HTMLElement>;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userId,
  triggerRef,
}: DeleteAccountModalProps) {
  const { user } = useAuth();
  const [confirmationText, setConfirmationText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteMutation = useDeleteAccount();

  // Use shared modal hook for focus, escape, scroll lock, and overlay click
  // Focus the input field instead of the disabled confirm button for better accessibility
  const { handleOverlayClick } = useModal(isOpen, onClose, inputRef, triggerRef);

  // Reset confirmation text when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
    }
  }, [isOpen]);

  // Handle confirmation text change
  const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (confirmationText !== 'I am sure' || !user) return;

    try {
      await deleteMutation.mutateAsync(userId);
      // onSuccess in the hook will handle sign out and cache clearing
      // The user will be redirected by the auth state change
    } catch (error) {
      console.error('Error deleting account:', error);
      // Error is handled by the mutation, but we don't close the modal on error
    }
  };

  if (!isOpen) {
    return null;
  }

  const isConfirmEnabled = confirmationText === 'I am sure' && !deleteMutation.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-xl max-w-md w-[90%] p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cq-delete-account-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5">
          <h2
            id="cq-delete-account-modal-title"
            className="text-2xl font-bold text-red-600"
          >
            Delete My Account
          </h2>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="mb-4 text-gray-800 leading-relaxed">
            This action cannot be undone.
          </p>
          <p className="mb-4 text-gray-600 text-sm leading-relaxed">
            To confirm, please type <strong>"I am sure"</strong> below:
          </p>
          <input
            ref={inputRef}
            type="text"
            value={confirmationText}
            onChange={handleConfirmationChange}
            placeholder="I am sure"
            aria-label='Type "I am sure" to confirm account deletion'
            disabled={deleteMutation.isPending}
            className="w-full p-3 border border-gray-300 rounded-lg text-base mb-5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={!isConfirmEnabled}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Confirm Account Deletion'}
          </button>
        </div>

        {/* Error message */}
        {deleteMutation.isError && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
            Failed to delete account. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

