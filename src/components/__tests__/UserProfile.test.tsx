import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfile from '../UserProfile';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';
import { supabase } from '../../lib/supabaseClient';
import * as useUserProfileHooks from '../../hooks/useUserProfile';

vi.mock('../../lib/queries');
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn()
    }
  }
}));
vi.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: vi.fn(),
  useUserPomodoros: vi.fn(),
  useFollowers: vi.fn(),
  useFollowing: vi.fn(),
  usePendingFollowRequests: vi.fn(),
}));

const mockHooks = vi.mocked(useUserProfileHooks);

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockUser = {
  id: 'user-123',
  user_name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z'
};

const mockDoros = [
  {
    id: 'doro-1',
    task: 'Task 1',
    notes: 'Notes 1',
    launch_at: '2024-01-15T10:00:00Z',
    completed: true,
    image_url: null,
    user_id: 'user-123',
    created_at: '2024-01-15T09:00:00Z',
    users: mockUser,
    likes: [],
    comments: []
  }
];

const renderWithRouter = (userId: string, authUser = mockUser) => {
  const queryClient = createTestQueryClient();

  // Determine if viewing own profile
  const isOwnProfile = authUser?.id === userId;
  // For own profile, use authUser as userProfile; for others, it will be fetched
  // This matches component behavior: when viewing own profile, it uses authUserProfile from context
  const userProfile = isOwnProfile ? mockUser : null;

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/user/${userId}`]} future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{
          user: authUser,
          userProfile: userProfile,
          loading: false,
          session: null
        }}>
          <Routes>
            <Route path="/user/:userId" element={<UserProfile />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/user-123');

    // Mock hooks with default values
    mockHooks.useUserProfile.mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    mockHooks.useFollowers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    mockHooks.useFollowing.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    mockHooks.usePendingFollowRequests.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    // Mock isFollowingUser by default
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });

    // Mock functions needed by FollowButton component
    vi.mocked(queries.isBlockedByUser).mockResolvedValue(false);
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });

    // Mock block status used by profile + BlockButton
    vi.mocked((queries as any).getBlockStatus).mockResolvedValue({ iBlocked: false, theyBlocked: false });
  });

  it('should load and display user profile', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John Doe', level: 1 })).toBeInTheDocument();
    });
  });

  it('should display user avatar', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123');

    await waitFor(() => {
      const avatar = screen.getByAltText('user-pic');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('should show logout button for own profile', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123', mockUser);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });

  it('should show follow button for other users profiles', async () => {
    const otherUser = {
      ...mockUser,
      id: 'other-user',
      user_name: 'Other User'
    };

    mockHooks.useUserProfile.mockReturnValue({
      data: otherUser,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    window.history.pushState({}, '', '/user/other-user');
    renderWithRouter('other-user', mockUser);

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
      // FollowButton should be rendered
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });
  });

  it('should show block button for other users profiles when not following', async () => {
    const otherUser = {
      ...mockUser,
      id: 'other-user',
      user_name: 'Other User'
    };

    mockHooks.useUserProfile.mockReturnValue({
      data: otherUser,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    window.history.pushState({}, '', '/user/other-user');
    renderWithRouter('other-user', mockUser);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Block' })).toBeInTheDocument();
    });
  });

  it('should not show block button for other users profiles when already following', async () => {
    const otherUser = {
      ...mockUser,
      id: 'other-user',
      user_name: 'Other User'
    };

    mockHooks.useUserProfile.mockReturnValue({
      data: otherUser,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: true,
      error: null
    });

    window.history.pushState({}, '', '/user/other-user');
    renderWithRouter('other-user', mockUser);

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Block' })).not.toBeInTheDocument();
  });

  it('should show blocked-state view when I have blocked the profile user', async () => {
    const otherUser = {
      ...mockUser,
      id: 'other-user',
      user_name: 'Other User'
    };

    mockHooks.useUserProfile.mockReturnValue({
      data: otherUser,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked((queries as any).getBlockStatus).mockResolvedValue({ iBlocked: true, theyBlocked: false });

    window.history.pushState({}, '', '/user/other-user');
    renderWithRouter('other-user', mockUser);

    await waitFor(() => {
      expect(screen.getByText(/You blocked Other User/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Unblock' }).length).toBeGreaterThan(0);
    });
  });

  it('should display users pomodoros', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  it('should show empty state when user has no pomodoros', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText(/no pomodoros found/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const createMockDorosArray = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `doro-${i + 1}`,
        task: `Task ${i + 1}`,
        notes: `Notes ${i + 1}`,
        launch_at: '2024-01-15T10:00:00Z',
        completed: true,
        image_url: null,
        user_id: 'user-123',
        created_at: '2024-01-15T09:00:00Z',
        users: mockUser,
        likes: [],
        comments: []
      }));
    };

    it('should not show pagination when user has <= 20 pomodoros', async () => {
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros20, count: 20 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Pagination should not be visible
      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
    });

    it('should show pagination when user has > 20 pomodoros', async () => {
      const mockDoros21 = createMockDorosArray(20); // First page shows 20

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros21, count: 87 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Pagination should be visible
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('should display page info when pomodoros are shown', async () => {
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros20, count: 87 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText(/showing 1–20 of 87 pomodoros/i)).toBeInTheDocument();
      });
    });

    it('should load page 2 when Next button is clicked', async () => {
      const user = userEvent.setup();
      const mockDoros20Page1 = createMockDorosArray(20);
      const mockDoros20Page2 = createMockDorosArray(20).map((doro, i) => ({
        ...doro,
        id: `doro-page2-${i + 1}`,
        task: `Page 2 Task ${i + 1}`
      }));

      // First call returns page 1
      mockHooks.useUserPomodoros
        .mockReturnValueOnce({
          data: { data: mockDoros20Page1, count: 50 },
          isLoading: false,
          isError: false,
          error: null,
          isSuccess: true,
          isFetching: false,
          refetch: vi.fn(),
        } as any)
        // Second call returns page 2
        .mockReturnValueOnce({
          data: { data: mockDoros20Page2, count: 50 },
          isLoading: false,
          isError: false,
          error: null,
          isSuccess: true,
          isFetching: false,
          refetch: vi.fn(),
        } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Page 2 Task 1')).toBeInTheDocument();
      });
    });

    it('should show loading spinner during page transition', async () => {
      const user = userEvent.setup();
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros
        .mockReturnValueOnce({
          data: { data: mockDoros20, count: 50 },
          isLoading: false,
          isError: false,
          error: null,
          isSuccess: true,
          isFetching: false,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { data: mockDoros20, count: 50 },
          isLoading: true,
          isError: false,
          error: null,
          isSuccess: false,
          isFetching: true,
          refetch: vi.fn(),
        } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      // Should show loading spinner
      expect(screen.getByText(/loading pomodoros/i)).toBeInTheDocument();
    });

    it('should call getUserPomodoros with page and pageSize parameters', async () => {
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros20, count: 50 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        // When viewing own profile (user-123), currentUserId should be user-123 (authUser.id)
        expect(mockHooks.useUserPomodoros).toHaveBeenCalledWith('user-123', 1, 20, 'user-123');
      });
    });

    it('should handle edge case of exactly 20 pomodoros (no pagination)', async () => {
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros20, count: 20 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Should show page info
      expect(screen.getByText(/showing 1–20 of 20 pomodoros/i)).toBeInTheDocument();

      // But no pagination controls
      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
    });

    it('should handle edge case of 21 pomodoros (2 pages)', async () => {
      const mockDoros20 = createMockDorosArray(20);

      mockHooks.useUserPomodoros.mockReturnValue({
        data: { data: mockDoros20, count: 21 },
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Should show pagination with 2 pages
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    });
  });

  it('should call signOut when logout button clicked', async () => {
    const user = userEvent.setup();

    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    renderWithRouter('user-123', mockUser);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John Doe', level: 1 })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should show loading spinner while fetching data', () => {
    // Test loading state when viewing another user's profile
    const otherUserId = 'other-user-123';
    mockHooks.useUserProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      isFetching: true,
      refetch: vi.fn(),
    } as any);

    // View another user's profile (not own profile) so getUserProfile is called
    renderWithRouter(otherUserId, mockUser);

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('should display completed pomodoros count', async () => {
    mockHooks.useUserPomodoros.mockReturnValue({
      data: { data: mockDoros, count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText(/completed pomodoros/i)).toBeInTheDocument();
    });
  });
});
