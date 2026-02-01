import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FriendsLeaderboard from '../FriendsLeaderboard';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUser = {
  id: 'current-user-id',
  user_name: 'Current User',
  email: 'current@example.com',
  avatar_url: 'https://example.com/current.jpg',
};

const mockFriendsData = [
  {
    user_id: 'current-user-id',
    user_name: 'Current User',
    avatar_url: 'https://example.com/current.jpg',
    completion_count: 25,
    is_following: true,
  },
  {
    user_id: 'friend-xyz-111',
    user_name: 'Best Friend',
    avatar_url: 'https://example.com/friend1.jpg',
    completion_count: 20,
    is_following: true,
  },
  {
    user_id: 'friend-xyz-222',
    user_name: 'Another Friend',
    avatar_url: 'https://example.com/friend2.jpg',
    completion_count: 15,
    is_following: true,
  },
];

const renderWithRouter = (user = mockUser, mockNavigate = vi.fn()) => {
  vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const result = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user,
            userProfile: user,
            loading: false,
            session: null,
          }}
        >
          <FriendsLeaderboard />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...result, mockNavigate };
};

describe('FriendsLeaderboard - User Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render friends with correct user_id in navigation', async () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: mockFriendsData,
      error: null,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Best Friend')).toBeInTheDocument();
    });

    // Verify all friends are displayed
    expect(screen.getByText('Current User')).toBeInTheDocument();
    expect(screen.getByText('Best Friend')).toBeInTheDocument();
    expect(screen.getByText('Another Friend')).toBeInTheDocument();
  });

  it('should navigate to correct user profile when clicking friend item', async () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: mockFriendsData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Best Friend')).toBeInTheDocument();
    });

    // Click on friend's leaderboard item
    const friendItem = screen.getByText('Best Friend').closest('.cq-friends-leaderboard-item');
    expect(friendItem).toBeInTheDocument();
    
    await user.click(friendItem!);

    // Verify navigate was called with the correct friend's user_id
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/user/friend-xyz-111');
    });
  });

  it('should navigate to own profile when clicking current user item', async () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: mockFriendsData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Current User')).toBeInTheDocument();
    });

    // Click on current user's item (should be highlighted differently)
    const currentUserItem = screen.getByText('Current User').closest('.cq-friends-leaderboard-item-current-user');
    expect(currentUserItem).toBeInTheDocument();
    
    await user.click(currentUserItem!);

    // Verify navigate was called with current user's ID
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/user/current-user-id');
    });
  });

  it('should not navigate to /user/undefined (regression test)', async () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: mockFriendsData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Another Friend')).toBeInTheDocument();
    });

    // Click on any friend
    const friendItem = screen.getByText('Another Friend').closest('.cq-friends-leaderboard-item');
    await user.click(friendItem!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    // Critical: ensure navigate does NOT contain 'undefined'
    const navigationCall = navigate.mock.calls[0][0];
    expect(navigationCall).not.toContain('undefined');
    expect(navigationCall).toBe('/user/friend-xyz-222');
  });

  it('should handle friends leaderboard data with user_id field (regression test)', async () => {
    // This test validates that data structure has 'user_id' field, not 'id'
    const dataWithCorrectField = [
      {
        user_id: 'friend-with-correct-field',  // ✅ Correct field name
        user_name: 'Correct Field Friend',
        avatar_url: 'https://example.com/correct.jpg',
        completion_count: 10,
        is_following: true,
      },
    ];

    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: dataWithCorrectField,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Correct Field Friend')).toBeInTheDocument();
    });

    const friendItem = screen.getByText('Correct Field Friend').closest('.cq-friends-leaderboard-item');
    await user.click(friendItem!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    // Should navigate using the user_id field
    expect(navigate).toHaveBeenCalledWith('/user/friend-with-correct-field');
  });

  it('should show empty state when user has no friends', async () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/No friends yet!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No friends yet!/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow other users/i)).toBeInTheDocument();
  });

  it('should show login prompt when not authenticated', () => {
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: null,
              userProfile: null,
              loading: false,
              session: null,
            }}
          >
            <FriendsLeaderboard />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Please log in to see your friends leaderboard/i)).toBeInTheDocument();
  });
});
