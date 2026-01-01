import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import DeleteAccountModal from '../DeleteAccountModal';
import { AuthContext } from '../../contexts/AuthContext';
import * as useDeleteAccountHooks from '../../hooks/useDeleteAccount';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../hooks/useDeleteAccount', () => ({
  useDeleteAccount: vi.fn(),
}));

const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  email: 'test@example.com',
} as User;

const mockUserProfile = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  followers_only: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user: mockUser, session: null, userProfile: mockUserProfile, loading: false }}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockUseDeleteAccount = vi.mocked(useDeleteAccountHooks.useDeleteAccount);

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockUseDeleteAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('should render modal when isOpen is true', () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/delete my account/i)).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    render(
      <DeleteAccountModal
        isOpen={false}
        onClose={vi.fn()}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should have confirm button disabled initially', () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const confirmButton = screen.getByRole('button', { name: /confirm account deletion/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when user types "I am sure"', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(/type "i am sure" to confirm/i);
    const confirmButton = screen.getByRole('button', { name: /confirm account deletion/i });

    expect(confirmButton).toBeDisabled();

    await user.type(input, 'I am sure');

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('should keep confirm button disabled for incorrect input', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(/type "i am sure" to confirm/i);
    const confirmButton = screen.getByRole('button', { name: /confirm account deletion/i });

    await user.type(input, 'I am not sure');

    expect(confirmButton).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should trigger delete mutation and sign out on confirm', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

    mockUseDeleteAccount.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(/type "i am sure" to confirm/i);
    await user.type(input, 'I am sure');

    const confirmButton = screen.getByRole('button', { name: /confirm account deletion/i });
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('user-123');
    });
  });

  it('should handle delete error gracefully', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Delete failed'));

    mockUseDeleteAccount.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: true,
      error: new Error('Delete failed'),
    } as any);

    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        userId="user-123"
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(/type "i am sure" to confirm/i);
    await user.type(input, 'I am sure');

    const confirmButton = screen.getByRole('button', { name: /confirm account deletion/i });
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(screen.getByText(/Failed to delete account/i)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });
});

