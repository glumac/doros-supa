import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import PrivacySettings from '../PrivacySettings';
import { AuthContext } from '../../contexts/AuthContext';
import * as useUserProfileHooks from '../../hooks/useUserProfile';
import * as useBlockedUsersHooks from '../../hooks/useBlockedUsers';
import * as useMutationsHooks from '../../hooks/useMutations';
import * as useDeleteAccountHooks from '../../hooks/useDeleteAccount';

vi.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: vi.fn(),
}));

vi.mock('../../hooks/useBlockedUsers', () => ({
  useBlockedUsers: vi.fn(),
}));

vi.mock('../../hooks/useMutations', () => ({
  useUpdatePrivacyMutation: vi.fn(),
  useUnblockUserMutation: vi.fn(),
}));

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

const mockHooks = {
  useUserProfile: vi.mocked(useUserProfileHooks.useUserProfile),
  useBlockedUsers: vi.mocked(useBlockedUsersHooks.useBlockedUsers),
  useUpdatePrivacyMutation: vi.mocked(useMutationsHooks.useUpdatePrivacyMutation),
  useUnblockUserMutation: vi.mocked(useMutationsHooks.useUnblockUserMutation),
  useDeleteAccount: vi.mocked(useDeleteAccountHooks.useDeleteAccount),
};

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
};

const renderWithAuth = (component: React.ReactElement, user: User | null = mockUser) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, session: null, userProfile: mockUserProfile, loading: false }}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockHooks.useUserProfile.mockReturnValue({
      data: mockUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useBlockedUsers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUpdatePrivacyMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUnblockUserMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useDeleteAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('should show login message when user is not logged in', () => {
    render(
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user: null, session: null, userProfile: null, loading: false }}>
          <PrivacySettings />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Please log in to access privacy settings/i)).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display current privacy settings', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
      expect(screen.getByText('Followers Only')).toBeInTheDocument();
    });
  });

  it('should display toggle in off state when followers_only is false', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
      if (toggleButton) {
        const toggleSwitch = toggleButton.querySelector('div');
        expect(toggleSwitch).toHaveStyle({ left: '2px' });
      }
    });
  });

  it('should display toggle in on state when followers_only is true', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
      if (toggleButton) {
        const toggleSwitch = toggleButton.querySelector('div');
        expect(toggleSwitch).toHaveStyle({ left: '24px' });
      }
    });
  });

  it('should toggle setting when button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUpdatePrivacyMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      await user.click(toggleButton);
    }

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        userId: 'user-123',
        isPrivate: true,
      });
    });
  });

  it('should show success message after updating', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUpdatePrivacyMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      await user.click(toggleButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Settings updated successfully')).toBeInTheDocument();
    });
  });

  it('should show error message on update failure', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Update failed'));

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUpdatePrivacyMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      await user.click(toggleButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should disable button while saving', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(undefined), 100)));

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useUpdatePrivacyMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      expect(toggleButton).toBeDisabled();
    }
  });


  it('should display description of what the setting does', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/When enabled, users must send a follow request before they can follow you/i)).toBeInTheDocument();
      expect(screen.getByText(/You'll be able to approve or decline each request/i)).toBeInTheDocument();
      expect(screen.getByText(/Your weekly pomodoro totals will still appear on the global leaderboard/i)).toBeInTheDocument();
      expect(screen.getByText(/your total pomodoro count will still be visible in search/i)).toBeInTheDocument();
      expect(screen.getByText(/individual pomodoros will only be visible to approved followers/i)).toBeInTheDocument();
      expect(screen.getByText(/When disabled, your pomodoros appear in the global feed and anyone can follow you instantly/i)).toBeInTheDocument();
    });
  });

  it('should render Delete my account section beneath Blocked Users', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    // Check for the heading specifically
    expect(screen.getByRole('heading', { name: /Delete my account/i })).toBeInTheDocument();
    // Check for the button specifically
    expect(screen.getByRole('button', { name: /Delete my account/i })).toBeInTheDocument();
  });

  it('should open delete account modal when Delete my account button is clicked', async () => {
    const user = userEvent.setup();

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        followers_only: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useDeleteAccount.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    // Get the button specifically (not the heading)
    const deleteButton = screen.getByRole('button', { name: /Delete my account/i });
    await user.click(deleteButton);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      // Check for the modal title specifically within the dialog
      const modalTitle = dialog.querySelector('#cq-delete-account-modal-title');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toHaveTextContent(/Delete my account/i);
    });
  });
});
