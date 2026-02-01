import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalLeaderboard from '../GlobalLeaderboard';
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

const mockLeaderboardData = [
  {
    user_id: 'user-abc-123',
    user_name: 'Top Performer',
    avatar_url: 'https://example.com/top.jpg',
    completion_count: 50,
  },
  {
    user_id: 'user-def-456',
    user_name: 'Second Place',
    avatar_url: 'https://example.com/second.jpg',
    completion_count: 30,
  },
  {
    user_id: 'user-ghi-789',
    user_name: 'Third Place',
    avatar_url: 'https://example.com/third.jpg',
    completion_count: 20,
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
          <GlobalLeaderboard />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...result, mockNavigate };
};

describe('GlobalLeaderboard - User Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render clickable items with correct user_id in navigation', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockLeaderboardData,
      error: null,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Top Performer')).toBeInTheDocument();
    });

    // Verify all users are displayed
    expect(screen.getByText('Top Performer')).toBeInTheDocument();
    expect(screen.getByText('Second Place')).toBeInTheDocument();
    expect(screen.getByText('Third Place')).toBeInTheDocument();

    // Find the leaderboard items
    const leaderboardItems = screen.getAllByRole('generic').filter(
      (el) => el.className.includes('cq-global-leaderboard-item')
    );

    // Should have 3 items
    expect(leaderboardItems.length).toBeGreaterThanOrEqual(3);
  });

  it('should navigate to correct user profile when clicking leaderboard item', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockLeaderboardData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Top Performer')).toBeInTheDocument();
    });

    // Click on the first user's leaderboard item
    const topPerformerItem = screen.getByText('Top Performer').closest('.cq-global-leaderboard-item');
    expect(topPerformerItem).toBeInTheDocument();
    
    await user.click(topPerformerItem!);

    // Verify navigate was called with the correct user_id
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/user/user-abc-123');
    });
  });

  it('should navigate to different users when clicking different items', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockLeaderboardData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Second Place')).toBeInTheDocument();
    });

    // Click on the second user's leaderboard item
    const secondPlaceItem = screen.getByText('Second Place').closest('.cq-global-leaderboard-item');
    expect(secondPlaceItem).toBeInTheDocument();
    
    await user.click(secondPlaceItem!);

    // Verify navigate was called with the second user's ID
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/user/user-def-456');
    });
  });

  it('should not navigate to /user/undefined when user_id is present (regression test)', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: mockLeaderboardData,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Third Place')).toBeInTheDocument();
    });

    // Click on any leaderboard item
    const thirdPlaceItem = screen.getByText('Third Place').closest('.cq-global-leaderboard-item');
    await user.click(thirdPlaceItem!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    // Critical regression test: ensure navigate does NOT contain 'undefined'
    const navigationCall = navigate.mock.calls[0][0];
    expect(navigationCall).not.toContain('undefined');
    expect(navigationCall).toBe('/user/user-ghi-789');
  });

  it('should handle leaderboard data where user_id field exists (regression test)', async () => {
    // This test specifically validates the data structure returned from the query
    // The component expects 'user_id', not 'id'
    const dataWithCorrectField = [
      {
        user_id: 'correct-field-user',  // ✅ Correct field name
        user_name: 'Test User',
        avatar_url: 'https://example.com/test.jpg',
        completion_count: 10,
      },
    ];

    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: dataWithCorrectField,
      error: null,
    });

    const mockNavigate = vi.fn();
    const { mockNavigate: navigate } = renderWithRouter(mockUser, mockNavigate);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const testUserItem = screen.getByText('Test User').closest('.cq-global-leaderboard-item');
    await user.click(testUserItem!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    // Should navigate to the correct user ID from user_id field
    expect(navigate).toHaveBeenCalledWith('/user/correct-field-user');
  });

  it('should not break when clicking on empty leaderboard', async () => {
    vi.mocked(queries.getGlobalLeaderboard).mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/No users found this week/i)).toBeInTheDocument();
    });

    // Should display empty state message
    expect(screen.getByText(/No users found this week/i)).toBeInTheDocument();
  });
});
