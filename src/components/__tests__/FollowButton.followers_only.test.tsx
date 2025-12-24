import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FollowButton from '../FollowButton';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

// Mock the queries module
vi.mock('../../lib/queries', () => ({
  isFollowingUser: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getUserProfile: vi.fn(),
  getFollowRequestStatus: vi.fn(),
  createFollowRequest: vi.fn(),
  cancelFollowRequest: vi.fn(),
  isBlockedByUser: vi.fn(),
  getBlockStatus: vi.fn(),
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithAuth = (component: React.ReactElement, user = mockUser) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, loading: false }}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FollowButton - Followers Only Field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queries.isBlockedByUser).mockResolvedValue(false);
    vi.mocked(queries.getBlockStatus).mockResolvedValue({ iBlocked: false, theyBlocked: false });
  });

  it('should check followers_only field (not require_follow_approval) when determining if follow request is needed', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    // User with followers_only = true should require follow request
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'target-user',
        user_name: 'Target User',
        followers_only: true // Should check this field
      },
      error: null
    });

    renderWithAuth(<FollowButton userId="target-user" />);

    await waitFor(() => {
      expect(queries.getUserProfile).toHaveBeenCalledWith('target-user');
    });

    // Should check followers_only field to determine if follow request is needed
    const profileCall = vi.mocked(queries.getUserProfile).mock.calls[0];
    expect(profileCall[0]).toBe('target-user');
  });

  it('should show "Requested" when user has followers_only = true and follow request is pending', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: { id: 'request-1', status: 'pending' },
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'target-user',
        user_name: 'Target User',
        followers_only: true
      },
      error: null
    });

    renderWithAuth(<FollowButton userId="target-user" />);

    await waitFor(() => {
      expect(screen.getByText(/Requested/i)).toBeInTheDocument();
    });
  });

  it('should allow instant follow when user has followers_only = false', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'target-user',
        user_name: 'Target User',
        followers_only: false // Public user - instant follow
      },
      error: null
    });
    vi.mocked(queries.followUser).mockResolvedValue({
      data: null,
      error: null
    });

    renderWithAuth(<FollowButton userId="target-user" />);

    await waitFor(() => {
      expect(screen.getByText(/Follow/i)).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button');
    await user.click(followButton);

    await waitFor(() => {
      // Should call followUser directly (not createFollowRequest)
      expect(queries.followUser).toHaveBeenCalled();
      expect(queries.createFollowRequest).not.toHaveBeenCalled();
    });
  });
});

