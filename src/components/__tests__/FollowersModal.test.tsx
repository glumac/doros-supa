import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import FollowersModal from '../FollowersModal';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  getFollowersList: vi.fn(),
  getFollowingList: vi.fn(),
  isFollowingUser: vi.fn(),
  getUserProfile: vi.fn(),
  getFollowRequestStatus: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  createFollowRequest: vi.fn(),
  cancelFollowRequest: vi.fn(),
  isBlockedByUser: vi.fn(),
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const mockFollowers = [
  {
    follower_id: 'follower-1',
    created_at: '2024-01-01',
    users: {
      id: 'follower-1',
      user_name: 'Follower One',
      avatar_url: 'https://example.com/follower1.jpg'
    }
  },
  {
    follower_id: 'follower-2',
    created_at: '2024-01-02',
    users: {
      id: 'follower-2',
      user_name: 'Follower Two',
      avatar_url: null
    }
  }
];

const mockFollowing = [
  {
    following_id: 'following-1',
    created_at: '2024-01-01',
    users: {
      id: 'following-1',
      user_name: 'Following One',
      avatar_url: 'https://example.com/following1.jpg'
    }
  }
];

const renderWithAuth = (component: React.ReactElement, user = mockUser) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, loading: false }}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('FollowersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks for FollowButton component
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    vi.mocked(queries.isBlockedByUser).mockResolvedValue(false);
  });

  it('should render modal with user name in header', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    const onClose = vi.fn();
    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={onClose}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={onClose}
      />
    );

    const closeButton = screen.getByText('×');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should display followers tab by default', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
      expect(screen.getByText('Follower Two')).toBeInTheDocument();
    });
  });

  it('should switch to following tab when clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });
    vi.mocked(queries.getFollowingList).mockResolvedValue({
      data: mockFollowing,
      count: 1,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
    });

    const followingTab = screen.getByRole('button', { name: /Following/i });
    await user.click(followingTab);

    await waitFor(() => {
      expect(screen.getByText('Following One')).toBeInTheDocument();
      expect(screen.queryByText('Follower One')).not.toBeInTheDocument();
    });
  });

  it('should show "No followers yet" when list is empty', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        initialTab="followers"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No followers yet')).toBeInTheDocument();
    });
  });

  it('should show "No following yet" when list is empty', async () => {
    vi.mocked(queries.getFollowingList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        initialTab="following"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No following yet')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    vi.mocked(queries.getFollowersList).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: [], count: 0, error: null }), 100))
    );

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display pagination when there are multiple pages', async () => {
    const manyFollowers = Array.from({ length: 25 }, (_, i) => ({
      follower_id: `follower-${i}`,
      created_at: '2024-01-01',
      users: {
        id: `follower-${i}`,
        user_name: `Follower ${i}`,
        avatar_url: null
      }
    }));

    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: manyFollowers.slice(0, 20),
      count: 25,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });
  });

  it('should navigate to next page', async () => {
    const user = userEvent.setup();
    const manyFollowers = Array.from({ length: 25 }, (_, i) => ({
      follower_id: `follower-${i}`,
      created_at: '2024-01-01',
      users: {
        id: `follower-${i}`,
        user_name: `Follower ${i}`,
        avatar_url: null
      }
    }));

    vi.mocked(queries.getFollowersList)
      .mockResolvedValueOnce({
        data: manyFollowers.slice(0, 20),
        count: 25,
        error: null
      })
      .mockResolvedValueOnce({
        data: manyFollowers.slice(20, 25),
        count: 25,
        error: null
      });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    });

    expect(queries.getFollowersList).toHaveBeenCalledWith('user-123', 2, 20);
  });

  it('should use fallback avatar when avatar_url is null', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower Two')).toBeInTheDocument();
    });

    // Check that there's an image with the placeholder data URI (SVG) in its src
    const images = screen.getAllByRole('img');
    const hasPlaceholder = images.some(img =>
      img.getAttribute('src')?.startsWith('data:image/svg+xml')
    );
    expect(hasPlaceholder).toBe(true);
  });
});
