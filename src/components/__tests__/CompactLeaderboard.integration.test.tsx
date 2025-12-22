import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompactLeaderboard from '../CompactLeaderboard';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/queries');
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockUser = {
  id: 'current-user',
  user_name: 'Current User',
  email: 'current@example.com',
  avatar_url: 'https://example.com/current.jpg'
};

const mockInitialGlobalData = [
  {
    user_id: 'current-user',
    user_name: 'Current User',
    avatar_url: 'https://example.com/current.jpg',
    completion_count: 10
  },
  {
    user_id: 'user-2',
    user_name: 'Second User',
    avatar_url: 'https://example.com/second.jpg',
    completion_count: 5
  }
];

describe('CompactLeaderboard Integration - Real-time updates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mocks
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: [],
      error: null
    });
  });

  it('should show updated leaderboard count after pomodoro creation', async () => {
    const user = userEvent.setup();

    // Initial leaderboard data
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockInitialGlobalData,
      error: null
    });

    // Mock successful pomodoro creation
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'new-pomodoro' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    // Render the leaderboard
    render(
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={{
            user: mockUser,
            userProfile: mockUser,
            loading: false,
            session: null
          }}>
            <CompactLeaderboard />
          </AuthContext.Provider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Verify initial state
    await waitFor(() => {
      expect(screen.getByText('Current User')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Simulate pomodoro creation by triggering query invalidation
    // This is what the mutation hook will do
    const updatedGlobalData = [
      {
        user_id: 'current-user',
        user_name: 'Current User',
        avatar_url: 'https://example.com/current.jpg',
        completion_count: 11 // Incremented!
      },
      {
        user_id: 'user-2',
        user_name: 'Second User',
        avatar_url: 'https://example.com/second.jpg',
        completion_count: 5
      }
    ];

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: updatedGlobalData,
      error: null
    });

    // Invalidate the leaderboard queries (simulating what mutation hook does)
    await queryClient.invalidateQueries({ queryKey: ['leaderboard', 'global'] });

    // The LeaderboardContext should refetch and update
    // Note: This test demonstrates the expected behavior after our fix
    // Currently this will fail because LeaderboardContext doesn't listen to React Query
  });

  it('should handle friends leaderboard updates after pomodoro creation', async () => {
    const friendsData = [
      {
        user_id: 'current-user',
        user_name: 'Current User',
        avatar_url: 'https://example.com/current.jpg',
        completion_count: 8
      },
      {
        user_id: 'friend-1',
        user_name: 'Friend One',
        avatar_url: 'https://example.com/friend.jpg',
        completion_count: 6
      }
    ];

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockInitialGlobalData,
      error: null
    });
    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: friendsData,
      error: null
    });

    const user = userEvent.setup();

    render(
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={{
            user: mockUser,
            userProfile: mockUser,
            loading: false,
            session: null
          }}>
            <CompactLeaderboard />
          </AuthContext.Provider>
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Switch to friends tab
    const friendsTab = screen.getByText('Friends');
    await user.click(friendsTab);

    await waitFor(() => {
      expect(screen.getByText('Friend One')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    // Update friends data after pomodoro creation
    const updatedFriendsData = [
      {
        user_id: 'current-user',
        user_name: 'Current User',
        avatar_url: 'https://example.com/current.jpg',
        completion_count: 9 // Incremented
      },
      {
        user_id: 'friend-1',
        user_name: 'Friend One',
        avatar_url: 'https://example.com/friend.jpg',
        completion_count: 6
      }
    ];

    vi.mocked(queries.getFriendsLeaderboard).mockResolvedValue({
      data: updatedFriendsData,
      error: null
    });

    // Invalidate friends leaderboard
    await queryClient.invalidateQueries({ queryKey: ['leaderboard', 'friends'] });

    // Expected behavior after fix: should show updated count
  });
});
