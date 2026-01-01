import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import RestoreAccount from '../RestoreAccount';
import { AuthContext } from '../../contexts/AuthContext';
import * as useRestoreAccountHooks from '../../hooks/useRestoreAccount';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useRestoreAccount', () => ({
  useRestoreAccount: vi.fn(),
}));

const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  email: 'test@example.com',
} as User;

const mockDeletedUserProfile = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  followers_only: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  deleted_at: '2024-12-31T00:00:00.000Z',
};

const mockUseRestoreAccount = vi.mocked(useRestoreAccountHooks.useRestoreAccount);

const createWrapper = (userProfile = mockDeletedUserProfile) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider
          value={{
            user: mockUser,
            session: null,
            userProfile,
            loading: false,
            refreshUserProfile: vi.fn(),
          }}
        >
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RestoreAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRestoreAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('should render account deleted message', () => {
    render(<RestoreAccount />, { wrapper: createWrapper() });

    expect(screen.getByText('Account Deleted')).toBeInTheDocument();
    expect(
      screen.getByText(/Your account has been deleted/i)
    ).toBeInTheDocument();
  });

  it('should display restore account button', () => {
    render(<RestoreAccount />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('button', { name: /restore account/i })
    ).toBeInTheDocument();
  });

  it('should display warning about friends not being restored', () => {
    render(<RestoreAccount />, { wrapper: createWrapper() });

    expect(
      screen.getByText(/Your friends and follow relationships will not be restored/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You will need to reconnect with friends manually/i)
    ).toBeInTheDocument();
  });

  it('should call restore mutation when restore button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
    const mockRefreshUserProfile = vi.fn().mockResolvedValue(undefined);

    mockUseRestoreAccount.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <AuthContext.Provider
            value={{
              user: mockUser,
              session: null,
              userProfile: mockDeletedUserProfile,
              loading: false,
              refreshUserProfile: mockRefreshUserProfile,
            }}
          >
            <RestoreAccount />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    const restoreButton = screen.getByRole('button', { name: /restore account/i });
    await user.click(restoreButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('user-123');
    });
  });

  it('should show loading state while restoring', () => {
    mockUseRestoreAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    render(<RestoreAccount />, { wrapper: createWrapper() });

    const restoreButton = screen.getByRole('button', { name: /restoring/i });
    expect(restoreButton).toBeDisabled();
  });

  it('should show error message on restore failure', () => {
    mockUseRestoreAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: true,
      error: new Error('Restore failed'),
    } as any);

    render(<RestoreAccount />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/Failed to restore account/i);
  });

  it('should navigate to home after successful restore', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
    const mockRefreshUserProfile = vi.fn().mockResolvedValue(undefined);

    mockUseRestoreAccount.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <AuthContext.Provider
            value={{
              user: mockUser,
              session: null,
              userProfile: mockDeletedUserProfile,
              loading: false,
              refreshUserProfile: mockRefreshUserProfile,
            }}
          >
            <RestoreAccount />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    const restoreButton = screen.getByRole('button', { name: /restore account/i });
    await user.click(restoreButton);

    await waitFor(() => {
      expect(mockRefreshUserProfile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show spinner when user or profile is not loaded', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <AuthContext.Provider
            value={{
              user: null,
              session: null,
              userProfile: null,
              loading: false,
              refreshUserProfile: vi.fn(),
            }}
          >
            <RestoreAccount />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should show spinner/loading state when no user
    expect(screen.queryByText('Account Deleted')).not.toBeInTheDocument();
  });
});



