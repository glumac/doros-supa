import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { UserStats } from '../UserStats';
import { AuthContext } from '../../contexts/AuthContext';
import type { User } from '../../types/models';
import * as queries from '../../lib/queries';
import * as userProfileHooks from '../../hooks/useUserProfile';

// Mock the query functions
vi.mock('../../lib/queries', async (importOriginal) => {
  const original = await importOriginal<typeof queries>();
  return {
    ...original,
    getUserStats: vi.fn(),
    getUserDailyCompletions: vi.fn(),
    getUserWeeklyCompletions: vi.fn(),
    getUserMonthlyCompletions: vi.fn(),
  };
});

// Mock the useUserProfile hooks
vi.mock('../../hooks/useUserProfile');

const mockGetUserStats = queries.getUserStats as Mock;
const mockGetUserDailyCompletions = queries.getUserDailyCompletions as Mock;
const mockGetUserWeeklyCompletions = queries.getUserWeeklyCompletions as Mock;
const mockGetUserMonthlyCompletions = queries.getUserMonthlyCompletions as Mock;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock user profile
const mockUserProfile: User = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
};

const mockAuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as SupabaseAuthUser;

const mockStats = {
  total_pomodoros: 150,
  completed_pomodoros: 142,
  active_days: 45,
  total_days: 365,
};

const renderUserStats = (initialRoute = '/stats') => {
  const queryClient = createTestQueryClient();

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{
          user: mockAuthUser,
          userProfile: mockUserProfile,
          loading: false,
          session: null,
          refreshUserProfile: vi.fn(),
        }}>
          <UserStats />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('UserStats - All-Time with Day View Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockGetUserStats.mockResolvedValue({ data: mockStats, error: null });
    mockGetUserDailyCompletions.mockResolvedValue({ data: [], error: null });
    mockGetUserWeeklyCompletions.mockResolvedValue({ data: [], error: null });

    // Mock monthly data spanning multiple years for all-time view
    const mockMonthlyData = [
      { month_start: '2024-01-01', count: 20 },
      { month_start: '2024-02-01', count: 25 },
      { month_start: '2024-03-01', count: 30 },
      { month_start: '2024-04-01', count: 15 },
      { month_start: '2024-05-01', count: 22 },
      { month_start: '2025-01-01', count: 35 },
      { month_start: '2025-02-01', count: 28 },
      { month_start: '2026-01-01', count: 40 },
    ];
    mockGetUserMonthlyCompletions.mockResolvedValue({ data: mockMonthlyData, error: null });

    // Mock followers/following hooks
    vi.spyOn(userProfileHooks, 'useFollowers').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.spyOn(userProfileHooks, 'useFollowing').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should not show blank chart when accessing /stats?timeframe=all-time&view=day', async () => {
    // This test reproduces the bug: accessing all-time with view=day shows a blank chart
    // Expected behavior: Should ignore invalid view parameter and default to month view
    renderUserStats('/stats?timeframe=all-time&view=day');

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Stats')).toBeInTheDocument();
    });

    // Should still show the chart title/label (not blank) - THIS IS THE KEY FIX
    await waitFor(() => {
      // The chart should show monthly data (falling back from invalid "day" view)
      const chartLabel = screen.getByText(/monthly completions/i);
      expect(chartLabel).toBeInTheDocument();
    });

    // Chart container should exist
    const chartContainer = document.querySelector('.cq-user-stats-chart');
    expect(chartContainer).toBeInTheDocument();

    // The month view radio button should be checked (showing we defaulted correctly)
    const monthRadio = screen.getByLabelText('View by month') as HTMLInputElement;
    expect(monthRadio.checked).toBe(true);
  });

  it('should default to month view when all-time has invalid view parameter', async () => {
    renderUserStats('/stats?timeframe=all-time&view=day');

    await waitFor(() => {
      // Should show "Monthly Completions" as the chart title, not "Daily Completions"
      expect(screen.getByText('Monthly Completions')).toBeInTheDocument();
      expect(screen.queryByText('Daily Completions')).not.toBeInTheDocument();
    });
  });

  it('should only show month/year view toggles for all-time, not day', async () => {
    renderUserStats('/stats?timeframe=all-time&view=day');

    await waitFor(() => {
      // View toggle buttons should exist
      const monthButton = screen.getByLabelText(/view by month/i);
      const yearButton = screen.getByLabelText(/view by year/i);

      expect(monthButton).toBeInTheDocument();
      expect(yearButton).toBeInTheDocument();

      // Should NOT show a day view button
      const dayButton = screen.queryByLabelText(/view by day/i);
      expect(dayButton).not.toBeInTheDocument();
    });
  });

  it('should call monthly completions query with undefined dates for all-time', async () => {
    renderUserStats('/stats?timeframe=all-time&view=day');

    await waitFor(() => {
      // Verify that monthly completions is called with undefined dates (all-time)
      expect(mockGetUserMonthlyCompletions).toHaveBeenCalledWith('user-123', undefined, undefined);
    });
  });

  it('should display monthly chart data correctly when invalid day view is requested', async () => {
    renderUserStats('/stats?timeframe=all-time&view=day');

    await waitFor(() => {
      // The chart title should show "Monthly Completions" (not "Daily Completions")
      expect(screen.getByText('Monthly Completions')).toBeInTheDocument();

      // Should also show the "All Time" timeframe label in the chart area
      const allTimeLabel = document.querySelector('.cq-user-stats-timeframe-title');
      expect(allTimeLabel).toHaveTextContent('All Time');
    });

    // Verify monthly completions query was called with undefined dates (all-time)
    expect(mockGetUserMonthlyCompletions).toHaveBeenCalledWith('user-123', undefined, undefined);
  });
});
