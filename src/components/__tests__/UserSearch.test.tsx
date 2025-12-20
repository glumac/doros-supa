import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UserSearch from '../UserSearch';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries');

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
});
