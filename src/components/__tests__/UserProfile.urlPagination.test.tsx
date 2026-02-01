import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfile from '../UserProfile';
import { AuthContext } from '../../contexts/AuthContext';

// Mock hooks
vi.mock('../../hooks/useUserProfile');
vi.mock('../../hooks/useFollowStatus');
vi.mock('../../hooks/useMutations');

import * as useUserProfileHooks from '../../hooks/useUserProfile';
import * as useFollowStatusHooks from '../../hooks/useFollowStatus';

describe('UserProfile - URL-based Pagination', () => {
  let queryClient: QueryClient;

  const mockAuthUser = {
    id: 'auth-user-123',
    user_metadata: { user_name: 'AuthUser' },
  };

  const mockUserProfile = {
    id: 'user-123',
    user_name: 'TestUser',
    avatar_url: null,
    is_private: false,
  };

  const mockPomodoros = Array.from({ length: 20 }, (_, i) => ({
    id: `pomodoro-${i}`,
    user_id: 'user-123',
    task: `Task ${i}`,
    notes: `Notes ${i}`,
    completed: true,
    created_at: new Date(2024, 0, i + 1).toISOString(),
    launch_at: new Date(2024, 0, i + 1).toISOString(),
    users: mockUserProfile,
    likes: [],
    comments: [],
  }));

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(useUserProfileHooks, 'useUserProfile').mockReturnValue({
      data: mockUserProfile,
      isLoading: false,
    } as any);

    vi.spyOn(useUserProfileHooks, 'useUserPomodoros').mockReturnValue({
      data: {
        data: mockPomodoros,
        count: 100,
      },
      isLoading: false,
    } as any);

    vi.spyOn(useUserProfileHooks, 'useFollowers').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.spyOn(useUserProfileHooks, 'useFollowing').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.spyOn(useUserProfileHooks, 'usePendingFollowRequests').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.spyOn(useFollowStatusHooks, 'useIsFollowingUser').mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    vi.spyOn(useFollowStatusHooks, 'useBlockStatus').mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
  });

  const renderUserProfile = (initialRoute = '/user/user-123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user: mockAuthUser as any,
            userProfile: mockAuthUser as any,
            loading: false,
          }}
        >
          <MemoryRouter initialEntries={[initialRoute]}>
            <UserProfile />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  it('should read page number from URL query parameter', async () => {
    renderUserProfile('/user/user-123?page=2');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Verify that useUserPomodoros was called with page 2
    expect(useUserProfileHooks.useUserPomodoros).toHaveBeenCalledWith(
      'user-123',
      2,
      20,
      'auth-user-123'
    );
  });

  it('should default to page 1 when no page parameter in URL', async () => {
    renderUserProfile('/user/user-123');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Verify that useUserPomodoros was called with page 1
    expect(useUserProfileHooks.useUserPomodoros).toHaveBeenCalledWith(
      'user-123',
      1,
      20,
      'auth-user-123'
    );
  });

  it('should update URL when changing pages via pagination', async () => {
    const user = userEvent.setup();

    const { container } = renderUserProfile('/user/user-123');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Find pagination button for page 2
    const page2Button = screen.getByRole('button', { name: /2/i });
    await user.click(page2Button);

    // URL should be updated (we can't directly check URL in MemoryRouter,
    // but we can verify the hook was called with page 2)
    await waitFor(() => {
      const calls = (useUserProfileHooks.useUserPomodoros as any).mock.calls;
      const lastCall = calls[calls.length - 1] as any[];
      expect(lastCall[1]).toBe(2);
    });
  });

  it('should maintain page parameter when navigating with existing params', async () => {
    renderUserProfile('/user/user-123?page=3&tab=pomodoros');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    expect(useUserProfileHooks.useUserPomodoros).toHaveBeenCalledWith(
      'user-123',
      3,
      20,
      'auth-user-123'
    );
  });

  it('should scroll to top when changing pages', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    renderUserProfile('/user/user-123');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    const page2Button = screen.getByRole('button', { name: /2/i });
    await user.click(page2Button);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });

    scrollToSpy.mockRestore();
  });

  it('should handle invalid page parameter gracefully', async () => {
    renderUserProfile('/user/user-123?page=invalid');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Should fall back to state page (default 1)
    expect(useUserProfileHooks.useUserPomodoros).toHaveBeenCalledWith(
      'user-123',
      1,
      20,
      'auth-user-123'
    );
  });

  it('should reset to page 1 when userId changes', async () => {
    const { rerender } = renderUserProfile('/user/user-123?page=3');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Change to different user
    const differentUser = {
      id: 'user-456',
      user_name: 'DifferentUser',
      avatar_url: null,
      is_private: false,
    };

    vi.spyOn(useUserProfileHooks, 'useUserProfile').mockReturnValue({
      data: differentUser,
      isLoading: false,
    } as any);

    rerender(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user: mockAuthUser as any,
            userProfile: mockAuthUser as any,
            loading: false,
          }}
        >
          <MemoryRouter initialEntries={['/user/user-456']}>
            <UserProfile />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const calls = (useUserProfileHooks.useUserPomodoros as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('user-456');
      expect(lastCall[1]).toBe(1); // Reset to page 1
    });
  });

  it('should maintain backward compatibility with state-only pagination', async () => {
    const user = userEvent.setup();

    // Render without URL page param
    renderUserProfile('/user/user-123');

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    // Navigate using pagination component
    const page2Button = screen.getByRole('button', { name: /2/i });
    await user.click(page2Button);

    // Should still work even without reading URL
    await waitFor(() => {
      const calls = (useUserProfileHooks.useUserPomodoros as any).mock.calls;
      expect(calls.some((call: any[]) => call[1] === 2)).toBe(true);
    });
  });
});
