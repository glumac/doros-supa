import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
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

vi.mock('../../hooks/useUserProfile');

const mockGetUserStats = queries.getUserStats as any;
const mockGetUserDailyCompletions = queries.getUserDailyCompletions as any;
const mockGetUserWeeklyCompletions = queries.getUserWeeklyCompletions as any;
const mockGetUserMonthlyCompletions = queries.getUserMonthlyCompletions as any;

const mockUserProfile: User = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
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

const renderUserStats = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

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

describe('UserStats - Week Range Tests (Feb 1, 2026 = Saturday)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock current date as Saturday, February 1, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00Z'));

    // Default mocks
    mockGetUserStats.mockResolvedValue({
      data: {
        total_pomodoros: 10,
        completed_pomodoros: 10,
        active_days: 5,
        total_days: 7,
      },
      error: null,
    });

    mockGetUserDailyCompletions.mockResolvedValue({ data: [], error: null });
    mockGetUserWeeklyCompletions.mockResolvedValue({ data: [], error: null });
    mockGetUserMonthlyCompletions.mockResolvedValue({ data: [], error: null });

    vi.spyOn(userProfileHooks, 'useFollowers').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.spyOn(userProfileHooks, 'useFollowing').mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('this-week always shows exactly 7 days (Mon Jan 27 - Sun Feb 2)', async () => {
    renderUserStats('/stats?timeframe=this-week');

    // Wait for any of the data fetching calls to be made
    await waitFor(() => {
      expect(mockGetUserStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Check that getUserStats was called with Mon-Sun (7 days)
    const callArgs = mockGetUserStats.mock.calls[0];
    const userId = callArgs[0];
    const startDate = callArgs[1];
    const endDate = callArgs[2];

    expect(userId).toBe('user-123');
    expect(startDate).toBeDefined();
    expect(endDate).toBeDefined();

    // Parse the dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // This week should be Monday Jan 27 to Sunday Feb 2
    expect(start.getUTCDate()).toBe(27);
    expect(start.getUTCMonth()).toBe(0); // January (0-indexed)
    expect(start.getUTCFullYear()).toBe(2026);

    expect(end.getUTCDate()).toBe(2);
    expect(end.getUTCMonth()).toBe(1); // February (0-indexed)
    expect(end.getUTCFullYear()).toBe(2026);

    // Verify it's exactly 7 days (Monday to Sunday)
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6); // 6 days difference = 7 days total (inclusive)

    // Verify start is Monday (1) and end is Sunday (0)
    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(0); // Sunday
  });

  it('last-week always shows exactly 7 days (Mon Jan 20 - Sun Jan 26)', async () => {
    renderUserStats('/stats?timeframe=last-week');

    await waitFor(() => {
      expect(mockGetUserStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    const callArgs = mockGetUserStats.mock.calls[0];
    const startDate = callArgs[1];
    const endDate = callArgs[2];

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Last week should be Monday Jan 20 to Sunday Jan 26
    expect(start.getUTCDate()).toBe(20);
    expect(start.getUTCMonth()).toBe(0); // January
    expect(start.getUTCFullYear()).toBe(2026);

    expect(end.getUTCDate()).toBe(26);
    expect(end.getUTCMonth()).toBe(0); // January
    expect(end.getUTCFullYear()).toBe(2026);

    // Verify it's exactly 7 days
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6); // 6 days difference = 7 days total

    // Verify start is Monday and end is Sunday
    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(0); // Sunday
  });

  it('this-week shows day view only (never week view)', async () => {
    renderUserStats('/stats?timeframe=this-week&view=day');

    await waitFor(() => {
      expect(mockGetUserDailyCompletions).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Should call daily completions, not weekly
    expect(mockGetUserDailyCompletions).toHaveBeenCalled();

    // Verify the dates are still exactly 7 days
    const callArgs = mockGetUserDailyCompletions.mock.calls[0];
    const startDate = callArgs[1];
    const endDate = callArgs[2];

    const start = new Date(startDate);
    const end = new Date(endDate);

    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6); // Exactly 7 days
  });

  it('last-week shows day view only (never week view)', async () => {
    renderUserStats('/stats?timeframe=last-week&view=day');

    await waitFor(() => {
      expect(mockGetUserDailyCompletions).toHaveBeenCalled();
    }, { timeout: 3000 });

    const callArgs = mockGetUserDailyCompletions.mock.calls[0];
    const startDate = callArgs[1];
    const endDate = callArgs[2];

    const start = new Date(startDate);
    const end = new Date(endDate);

    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6); // Exactly 7 days
  });

  it('this-week range is never expanded (already Mon-Sun)', async () => {
    renderUserStats('/stats?timeframe=this-week');

    await waitFor(() => {
      expect(mockGetUserStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    const dailyCallArgs = mockGetUserDailyCompletions.mock.calls[0];
    const statsCallArgs = mockGetUserStats.mock.calls[0];

    // All hooks should be called with the SAME date range
    expect(dailyCallArgs[1]).toBe(statsCallArgs[1]); // same startDate
    expect(dailyCallArgs[2]).toBe(statsCallArgs[2]); // same endDate

    // Verify no expansion happened - should be exactly Mon-Sun
    const start = new Date(dailyCallArgs[1]);
    const end = new Date(dailyCallArgs[2]);

    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(0); // Sunday
  });

  it('last-week range is never expanded (already Mon-Sun)', async () => {
    renderUserStats('/stats?timeframe=last-week');

    await waitFor(() => {
      expect(mockGetUserStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    const dailyCallArgs = mockGetUserDailyCompletions.mock.calls[0];
    const statsCallArgs = mockGetUserStats.mock.calls[0];

    // All hooks should be called with the SAME date range
    expect(dailyCallArgs[1]).toBe(statsCallArgs[1]);
    expect(dailyCallArgs[2]).toBe(statsCallArgs[2]);

    const start = new Date(dailyCallArgs[1]);
    const end = new Date(dailyCallArgs[2]);

    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(0); // Sunday
  });
});
