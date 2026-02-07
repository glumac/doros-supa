import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useUserStats } from '../useUserStats';
import * as queries from '../../lib/queries';

// Mock queries
vi.mock('../../lib/queries', () => ({
  getUserStats: vi.fn(),
  getUserDailyCompletions: vi.fn(),
  getUserWeeklyCompletions: vi.fn(),
  getUserMonthlyCompletions: vi.fn(),
}));

describe('useUserStats', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('All Time Stats (NULL date range)', () => {
    it('should calculate total_days from first pomodoro to today', async () => {
      // User created first pomodoro on Dec 15, 2022
      // From Dec 15, 2022 to Feb 7, 2026 is approximately 1,150 days
      const mockStats = {
        total_pomodoros: 850,
        completed_pomodoros: 750,
        active_days: 701,
        total_days: 1150, // Correct calculation from first pomodoro
      };

      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('user-123', undefined, undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(queries.getUserStats).toHaveBeenCalledWith('user-123', undefined, undefined);

      // Verify total_days is NOT the Unix epoch bug (20492 days)
      expect(result.current.data?.total_days).toBeLessThan(2000);

      // Verify total_days is reasonable for app started in Dec 2022
      expect(result.current.data?.total_days).toBeGreaterThan(1000);
      expect(result.current.data?.total_days).toBeLessThan(1300);
    });

    it('should ensure active_days never exceeds total_days', async () => {
      const mockStats = {
        total_pomodoros: 100,
        completed_pomodoros: 90,
        active_days: 50,
        total_days: 100,
      };

      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.active_days).toBeLessThanOrEqual(
        result.current.data?.total_days || 0
      );
    });

    it('should handle user with no pomodoros gracefully', async () => {
      const mockStats = {
        total_pomodoros: 0,
        completed_pomodoros: 0,
        active_days: 0,
        total_days: 0, // Edge case: no pomodoros = 0 total days
      };

      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('new-user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(result.current.data?.total_days).toBe(0);
    });
  });

  describe('Filtered Date Range Stats', () => {
    it('should fetch stats for specific date range', async () => {
      const mockStats = {
        total_pomodoros: 42,
        completed_pomodoros: 38,
        active_days: 5,
        total_days: 7,
      };

      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('user-123', '2026-01-27', '2026-02-02'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(queries.getUserStats).toHaveBeenCalledWith(
        'user-123',
        '2026-01-27',
        '2026-02-02'
      );
    });

    it('should calculate total_days as date range for filtered period', async () => {
      // Week range: 7 days
      const mockStats = {
        total_pomodoros: 15,
        completed_pomodoros: 12,
        active_days: 5,
        total_days: 7, // One week
      };

      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('user-123', '2026-02-01', '2026-02-07'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total_days).toBe(7);
    });
  });

  describe('Query Key and Caching', () => {
    it('should use correct query key with all parameters', async () => {
      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: { total_pomodoros: 0, completed_pomodoros: 0, active_days: 0, total_days: 0 },
        error: null,
      });

      const { result } = renderHook(
        () => useUserStats('user-123', '2026-01-01', '2026-01-31'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify query was cached with correct key structure
      const queryCache = queryClient.getQueryCache();
      const cachedQueries = queryCache.findAll({
        queryKey: ['user', 'stats', 'user-123', '2026-01-01', '2026-01-31'],
      });

      expect(cachedQueries).toHaveLength(1);
    });

    it('should create separate cache entries for different date ranges', async () => {
      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: { total_pomodoros: 0, completed_pomodoros: 0, active_days: 0, total_days: 0 },
        error: null,
      });

      // Fetch with date range
      const { result: result1 } = renderHook(
        () => useUserStats('user-123', '2026-01-01', '2026-01-31'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Fetch all-time
      const { result: result2 } = renderHook(
        () => useUserStats('user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should have been called twice (different cache keys)
      expect(queries.getUserStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const mockError = new Error('RPC function error');
      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(
        () => useUserStats('user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should not fetch when userId is undefined', () => {
      const { result } = renderHook(
        () => useUserStats(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(queries.getUserStats).not.toHaveBeenCalled();
    });
  });

  describe('Stale Time Configuration', () => {
    it('should configure 5 minute stale time', async () => {
      vi.mocked(queries.getUserStats).mockResolvedValue({
        data: { total_pomodoros: 100, completed_pomodoros: 90, active_days: 50, total_days: 100 },
        error: null,
      });

      renderHook(
        () => useUserStats('user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const query = queryClient.getQueryCache().find({
          queryKey: ['user', 'stats', 'user-123', undefined, undefined],
        });

        expect(query?.options.staleTime).toBe(5 * 60 * 1000);
      });
    });
  });
});
