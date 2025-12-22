import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CompactLeaderboard from '../CompactLeaderboard';
import { AuthContext } from '../../contexts/AuthContext';
import { LeaderboardProvider } from '../../contexts/LeaderboardContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries');

const mockUser = {
  id: 'current-user',
  user_name: 'Current User',
  email: 'current@example.com',
  avatar_url: 'https://example.com/current.jpg'
};

const mockGlobalData = [
  {
    user_id: 'user-1',
    user_name: 'Top User',
    avatar_url: 'https://example.com/top.jpg',
    completion_count: 50
  },
  {
    user_id: 'user-2',
    user_name: 'Second User',
    avatar_url: 'https://example.com/second.jpg',
    completion_count: 30
  }
];

const mockFriendsData = [
  {
    user_id: 'current-user',
    user_name: 'Current User',
    avatar_url: 'https://example.com/current.jpg',
    completion_count: 20
  },
  {
    user_id: 'friend-1',
    user_name: 'Friend One',
    avatar_url: 'https://example.com/friend.jpg',
    completion_count: 15
  }
];

const renderWithAuth = (user = mockUser, closeToggle = vi.fn()) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{
        user,
        userProfile: user,
        loading: false,
        session: null
      }}>
        <LeaderboardProvider>
          <CompactLeaderboard closeToggle={closeToggle} />
        </LeaderboardProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('CompactLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mocks for LeaderboardProvider
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });
  });

  it('should render global leaderboard by default', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('Top User')).toBeInTheDocument();
      expect(screen.getByText('Second User')).toBeInTheDocument();
    });
  });

  it('should switch to friends tab when clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: mockFriendsData,
      error: null
    });

    renderWithAuth();

    const friendsTab = screen.getByRole('button', { name: /friends/i });
    await user.click(friendsTab);

    await waitFor(() => {
      expect(queries.getFriendsLeaderboard).toHaveBeenCalledWith('current-user');
      expect(screen.getByText('Friend One')).toBeInTheDocument();
    });
  });

  it('should display completion counts', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    vi.mocked(queries.getGlobalLeaderboard).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    vi.mocked(queries.getFriendsLeaderboard).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    renderWithAuth();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state for friends with no followers', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    const friendsTab = screen.getByRole('button', { name: /friends/i });
    await user.click(friendsTab);

    await waitFor(() => {
      expect(screen.getByText(/no friends yet/i)).toBeInTheDocument();
    });
  });

  it('should limit display to 10 users', async () => {
    const largeDataset = Array.from({ length: 20 }, (_, i) => ({
      user_id: `user-${i}`,
      user_name: `User ${i}`,
      avatar_url: `https://example.com/${i}.jpg`,
      completion_count: 100 - i
    }));

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: largeDataset,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      const userLinks = screen.getAllByRole('link');
      expect(userLinks.length).toBeLessThanOrEqual(10);
    });
  });

  it('should call closeToggle when user clicks on a profile', async () => {
    const user = userEvent.setup();
    const closeToggle = vi.fn();

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth(mockUser, closeToggle);

    await waitFor(() => {
      expect(screen.getByText('Top User')).toBeInTheDocument();
    });

    const profileLink = screen.getByText('Top User').closest('a');
    await user.click(profileLink!);

    expect(closeToggle).toHaveBeenCalledWith(false);
  });
});
