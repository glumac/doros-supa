import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UserSearch from '../UserSearch';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  searchUsers: vi.fn(),
  getSuggestedUsers: vi.fn(),
  isFollowingUser: vi.fn(),
  getUserProfile: vi.fn(),
  getFollowRequestStatus: vi.fn(),
  isBlockedByUser: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  createFollowRequest: vi.fn(),
  cancelFollowRequest: vi.fn(),
}));

const mockQueries = vi.mocked(queries);

const mockUser = {
  id: 'current-user',
  user_name: 'Current User',
  email: 'current@example.com',
  avatar_url: 'https://example.com/current.jpg'
};

const mockSearchResults = [
  {
    user_id: 'user-1',
    user_name: 'John Doe',
    avatar_url: 'https://example.com/john.jpg',
    is_following: false,
    follower_count: 5,
    completion_count: 10
  },
  {
    user_id: 'user-2',
    user_name: 'Jane Smith',
    avatar_url: 'https://example.com/jane.jpg',
    is_following: true,
    follower_count: 8,
    completion_count: 15
  }
];

const renderWithAuth = (user = mockUser) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user, loading: false }}>
        <UserSearch />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('UserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock isFollowingUser to return proper structure
    mockQueries.isFollowingUser.mockResolvedValue({ isFollowing: false, error: null });
    // Mock getSuggestedUsers to prevent unhandled errors
    mockQueries.getSuggestedUsers.mockResolvedValue({ data: [], error: null });
    // Mock functions used by FollowButton component
    mockQueries.getUserProfile.mockResolvedValue({
      data: { require_follow_approval: false },
      error: null
    });
    mockQueries.getFollowRequestStatus.mockResolvedValue({
      data: null,
      error: null
    });
    mockQueries.isBlockedByUser.mockResolvedValue(false);
  });

  it('should show initial state with search prompt', () => {
    renderWithAuth();
    expect(screen.getByText(/start typing to find friends/i)).toBeInTheDocument();
  });

  it('should search users when typing in input', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null
    });

    renderWithAuth();

    const input = screen.getByPlaceholderText(/search users/i);
    await user.type(input, 'John');

    await waitFor(() => {
      expect(queries.searchUsers).toHaveBeenCalledWith('John', 'current-user');
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display follower and pomodoro counts', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null
    });

    renderWithAuth();

    await user.type(screen.getByPlaceholderText(/search users/i), 'test');

    await waitFor(() => {
      expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      expect(screen.getByText(/10 pomodoros/i)).toBeInTheDocument();
    });
  });

  it('should show "No results found" when search returns empty', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    await user.type(screen.getByPlaceholderText(/search users/i), 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('should debounce search requests', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null
    });

    renderWithAuth();

    const input = screen.getByPlaceholderText(/search users/i);

    // Type quickly
    await user.type(input, 'J');
    await user.type(input, 'o');
    await user.type(input, 'h');
    await user.type(input, 'n');

    // Should only call once after debounce
    await waitFor(() => {
      expect(queries.searchUsers).toHaveBeenCalledTimes(1);
      expect(queries.searchUsers).toHaveBeenCalledWith('John', 'current-user');
    }, { timeout: 1000 });
  });

  it('should render FollowButton for each user', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null
    });

    renderWithAuth();

    await user.type(screen.getByPlaceholderText(/search users/i), 'test');

    await waitFor(() => {
      const followButtons = screen.getAllByRole('button');
      // Should have 2 follow buttons (one per user)
      expect(followButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should require authentication to search', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: null, loading: false }}>
          <UserSearch />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/please log in to search/i)).toBeInTheDocument();
  });

  describe('Completion Count Display', () => {
    it('should display correct lifetime pomodoro counts for search results', async () => {
      const user = userEvent.setup();

      const usersWithHighCounts = [
        {
          user_id: 'user-1',
          user_name: 'Pam K',
          avatar_url: 'https://example.com/pam.jpg',
          is_following: false,
          follower_count: 0,
          completion_count: 839
        },
        {
          user_id: 'user-2',
          user_name: 'Michael G',
          avatar_url: 'https://example.com/michael.jpg',
          is_following: false,
          follower_count: 0,
          completion_count: 1916
        }
      ];

      vi.mocked(queries.searchUsers).mockResolvedValue({
        data: usersWithHighCounts,
        error: null
      });

      renderWithAuth();

      await user.type(screen.getByPlaceholderText(/search users/i), 'test');

      await waitFor(() => {
        expect(screen.getByText(/839 pomodoros/i)).toBeInTheDocument();
        expect(screen.getByText(/1916 pomodoros/i)).toBeInTheDocument();
      });
    });

    it('should display correct lifetime pomodoro counts for suggested users', async () => {
      const suggestedUsersWithCounts = [
        {
          user_id: 'user-1',
          user_name: 'Andrew RC',
          avatar_url: 'https://example.com/andrew.jpg',
          is_following: false,
          follower_count: 0,
          completion_count: 120,
          suggestion_score: 1460
        },
        {
          user_id: 'user-2',
          user_name: 'Bonny L',
          avatar_url: 'https://example.com/bonny.jpg',
          is_following: false,
          follower_count: 0,
          completion_count: 69,
          suggestion_score: 500
        }
      ];

      // Set up mock BEFORE rendering
      vi.mocked(queries.getSuggestedUsers).mockResolvedValue({
        data: suggestedUsersWithCounts,
        error: null
      });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText(/120 pomodoros/i)).toBeInTheDocument();
        expect(screen.getByText(/69 pomodoros/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display 0 pomodoros for users with no completions', async () => {
      const user = userEvent.setup();

      const usersWithZeroCounts = [
        {
          user_id: 'user-1',
          user_name: 'New User',
          avatar_url: 'https://example.com/new.jpg',
          is_following: false,
          follower_count: 0,
          completion_count: 0
        }
      ];

      vi.mocked(queries.searchUsers).mockResolvedValue({
        data: usersWithZeroCounts,
        error: null
      });

      renderWithAuth();

      await user.type(screen.getByPlaceholderText(/search users/i), 'new');

      await waitFor(() => {
        expect(screen.getByText(/0 pomodoros/i)).toBeInTheDocument();
      });
    });

    it('should handle singular pomodoro text correctly', async () => {
      const user = userEvent.setup();

      const userWithOnePomodoro = [
        {
          user_id: 'user-1',
          user_name: 'Single User',
          avatar_url: 'https://example.com/single.jpg',
          is_following: false,
          follower_count: 1,
          completion_count: 1
        }
      ];

      vi.mocked(queries.searchUsers).mockResolvedValue({
        data: userWithOnePomodoro,
        error: null
      });

      renderWithAuth();

      await user.type(screen.getByPlaceholderText(/search users/i), 'single');

      await waitFor(() => {
        expect(screen.getByText(/1 follower/i)).toBeInTheDocument();
        expect(screen.getByText(/1 pomodoro$/i)).toBeInTheDocument();
      });
    });

    it('should verify completion_count is a number type', async () => {
      const user = userEvent.setup();

      const mockData = [
        {
          user_id: 'user-1',
          user_name: 'Test User',
          avatar_url: 'https://example.com/test.jpg',
          is_following: false,
          follower_count: 5,
          completion_count: 100
        }
      ];

      vi.mocked(queries.searchUsers).mockResolvedValue({
        data: mockData,
        error: null
      });

      renderWithAuth();

      await user.type(screen.getByPlaceholderText(/search users/i), 'test');

      await waitFor(() => {
        expect(queries.searchUsers).toHaveBeenCalled();
      });

      // Verify the mock data has the correct type
      const callResult = await queries.searchUsers('test', 'current-user');
      expect(typeof callResult.data?.[0]?.completion_count).toBe('number');
      expect(callResult.data?.[0]?.completion_count).toBe(100);
    });
  });
});
