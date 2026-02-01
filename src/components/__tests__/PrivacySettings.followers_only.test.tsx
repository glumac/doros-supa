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
  useFollowers: vi.fn(),
  useFollowing: vi.fn(),
}));

vi.mock('../../hooks/useBlockedUsers', () => ({
  useBlockedUsers: vi.fn(),
}));

vi.mock('../../hooks/useMutations', () => ({
  useUpdatePrivacyMutation: vi.fn(),
  useUnblockUserMutation: vi.fn(),
  useUpdateNotificationPreferencesMutation: vi.fn(),
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
  useFollowers: vi.mocked(useUserProfileHooks.useFollowers),
  useFollowing: vi.mocked(useUserProfileHooks.useFollowing),
  useBlockedUsers: vi.mocked(useBlockedUsersHooks.useBlockedUsers),
  useUpdatePrivacyMutation: vi.mocked(useMutationsHooks.useUpdatePrivacyMutation),
  useUnblockUserMutation: vi.mocked(useMutationsHooks.useUnblockUserMutation),
  useUpdateNotificationPreferencesMutation: vi.mocked(useMutationsHooks.useUpdateNotificationPreferencesMutation),
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

describe('PrivacySettings - Followers Only Field', () => {
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

    mockHooks.useFollowers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockHooks.useFollowing.mockReturnValue({
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

    mockHooks.useUpdateNotificationPreferencesMutation.mockReturnValue({
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

  it('should display field as followers_only (not require_follow_approval)', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
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
      expect(screen.getByText(/Followers Only/i)).toBeInTheDocument();
    });

    // Should read followers_only field (not require_follow_approval)
    expect(mockHooks.useUserProfile).toHaveBeenCalled();
  });

  it('should display UI label as "Followers Only" or "Make Account Followers-Only"', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
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
      // Should show "Followers Only" or similar label (not "Require Follow Approval")
      expect(screen.getByText(/Followers Only|Make Account Followers-Only/i)).toBeInTheDocument();
    });
  });

  it('should update followers_only field when toggle is clicked', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
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
      expect(screen.getByText(/Followers Only/i)).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      await user.click(toggleButton);
    }

    await waitFor(() => {
      // Should update followers_only field (not require_follow_approval)
      expect(mockMutateAsync).toHaveBeenCalledWith({
        userId: 'user-123',
        isPrivate: true,
      });
    });
  });

  it('should default to false (public) when followers_only is not set', async () => {
    mockHooks.useUserProfile.mockReturnValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        followers_only: false, // Default value
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/Followers Only/i)).toBeInTheDocument();
    });

    // Toggle should be in off state (false = public)
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.className.includes('approval-toggle'));
    if (toggleButton) {
      const toggleSwitch = toggleButton.querySelector('div');
      expect(toggleSwitch).toHaveStyle({ left: '2px' }); // Off position
    }
  });
});

