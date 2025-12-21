import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithAuth = (component: React.ReactElement, user = mockUser) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user, loading: false }}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when viewing own profile', () => {
    renderWithAuth(<FollowButton userId="user-123" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should not render when not logged in', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: null, loading: false }}>
          <FollowButton userId="other-user" />
        </AuthContext.Provider>
      </BrowserRouter>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show "Follow" when not following user', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow');
    });
  });

  it('should show "Following" when already following user', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: true,
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Following');
    });
  });

  it('should show "Requested" when follow request is pending', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: { id: 'request-123', status: 'pending' },
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: true },
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Requested');
    });
  });

  it('should follow instantly when user does not require approval', async () => {
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
      data: { require_follow_approval: false },
      error: null
    });
    vi.mocked(queries.followUser).mockResolvedValue({
      data: null,
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow');
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(queries.followUser).toHaveBeenCalledWith('user-123', 'other-user');

    await waitFor(() => {
      expect(button).toHaveTextContent('Following');
    });
  });

  it('should create follow request when user requires approval', async () => {
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
      data: { require_follow_approval: true },
      error: null
    });
    vi.mocked(queries.createFollowRequest).mockResolvedValue({
      data: null,
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow');
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(queries.createFollowRequest).toHaveBeenCalledWith('user-123', 'other-user');

    await waitFor(() => {
      expect(button).toHaveTextContent('Requested');
    });
  });

  it('should cancel follow request when "Requested" button is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: { id: 'request-123', status: 'pending' },
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: true },
      error: null
    });
    vi.mocked(queries.cancelFollowRequest).mockResolvedValue({
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Requested');
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(queries.cancelFollowRequest).toHaveBeenCalledWith('user-123', 'other-user');

    await waitFor(() => {
      expect(button).toHaveTextContent('Follow');
    });
  });

  it('should unfollow when "Following" button is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: true,
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });
    vi.mocked(queries.unfollowUser).mockResolvedValue({
      error: null
    });

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Following');
    });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(queries.unfollowUser).toHaveBeenCalledWith('user-123', 'other-user');

    await waitFor(() => {
      expect(button).toHaveTextContent('Follow');
    });
  });

  it('should call onFollowChange callback when provided', async () => {
    const user = userEvent.setup();
    const onFollowChange = vi.fn();

    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });
    vi.mocked(queries.followUser).mockResolvedValue({
      data: null,
      error: null
    });

    renderWithAuth(
      <FollowButton userId="other-user" onFollowChange={onFollowChange} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith(true);
    });
  });

  it('should disable button while loading', async () => {
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
      data: { require_follow_approval: false },
      error: null
    });
    vi.mocked(queries.followUser).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
    );

    renderWithAuth(<FollowButton userId="other-user" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow');
    });

    const button = screen.getByRole('button');
    const clickPromise = user.click(button);

    // Check immediately after click but before async completion
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await clickPromise;
  });
});
