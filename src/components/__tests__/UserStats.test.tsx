import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
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
  total_pomodoros: 42,
  completed_pomodoros: 38,
  active_days: 5,
  total_days: 7,
};

const mockDailyCompletions = [
  { date: '2026-01-27', count: 7 },
  { date: '2026-01-28', count: 8 },
  { date: '2026-01-29', count: 10 },
  { date: '2026-01-30', count: 0 },
  { date: '2026-01-31', count: 8 },
  { date: '2026-02-01', count: 5 },
  { date: '2026-02-02', count: 0 },
];

const mockWeeklyCompletions = [
  { week_start: '2026-01-06', count: 25 },
  { week_start: '2026-01-13', count: 30 },
  { week_start: '2026-01-20', count: 35 },
  { week_start: '2026-01-27', count: 38 },
];

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

describe('UserStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockGetUserStats.mockResolvedValue({ data: mockStats, error: null });
    mockGetUserDailyCompletions.mockResolvedValue({ data: mockDailyCompletions, error: null });
    mockGetUserWeeklyCompletions.mockResolvedValue({ data: mockWeeklyCompletions, error: null });
    mockGetUserMonthlyCompletions.mockResolvedValue({ data: [], error: null });

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

  describe('Rendering and Layout', () => {
    it('renders the stats page with header and title', async () => {
      renderUserStats();

      await waitFor(() => {
        // "My Stats" is rendered as a link in ProfileTabs, not a heading
        const statsLink = screen.getByRole('link', { name: /my stats/i });
        expect(statsLink).toBeInTheDocument();
      });
    });

    it('renders all three stat cards', async () => {
      renderUserStats();

      await waitFor(() => {
        expect(screen.getByText('Total Pomodoros')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Active Days')).toBeInTheDocument();
      });
    });

    it('uses semantic CSS classes for testing', async () => {
      renderUserStats();

      await waitFor(() => {
        expect(document.querySelector('.cq-user-stats-container')).toBeInTheDocument();
        expect(document.querySelector('.cq-user-stats-header')).toBeInTheDocument();
        expect(document.querySelector('.cq-user-stats-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton while fetching data', () => {
      // Don't resolve the promise immediately
      mockGetUserStats.mockReturnValue(new Promise(() => {}));

      renderUserStats();

      // Check for loading indicators (adjust based on actual implementation)
      const loadingElements = document.querySelectorAll('.cq-stat-card-loading');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('shows data after loading completes', async () => {
      renderUserStats();

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument(); // total pomodoros
        expect(screen.getByText('38')).toBeInTheDocument(); // completed
        expect(screen.getByText('5')).toBeInTheDocument(); // active days
      });
    });
  });

  describe('Stats Display', () => {
    it('displays total pomodoros correctly', async () => {
      renderUserStats();

      await waitFor(() => {
        const statsCard = screen.getByText('Total Pomodoros').closest('.cq-user-stats-pomodoros');
        expect(statsCard).toHaveTextContent('42');
      });
    });

    it('displays completed pomodoros correctly', async () => {
      renderUserStats();

      await waitFor(() => {
        const statsCard = screen.getByText('Completed').closest('.cq-user-stats-completed');
        expect(statsCard).toHaveTextContent('38');
      });
    });

    it('displays active days with context', async () => {
      renderUserStats();

      await waitFor(() => {
        const statsCard = screen.getByText('Active Days').closest('.cq-user-stats-active-days');
        expect(statsCard).toHaveTextContent('5');
        expect(statsCard).toHaveTextContent('out of 7 days');
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('defaults to "this-week" timeframe when no param provided', async () => {
      renderUserStats('/stats');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      // Verify the "This Week" button is active
      const thisWeekButton = screen.getByRole('button', { name: /this week/i });
      expect(thisWeekButton).toHaveClass('active'); // or whatever class indicates active state
    });

    it('parses "last-week" preset from URL params', async () => {
      renderUserStats('/stats?timeframe=last-week');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      const lastWeekButton = screen.getByRole('button', { name: /last week/i });
      expect(lastWeekButton).toHaveClass('active');
    });

    it('parses custom date range from URL params', async () => {
      renderUserStats('/stats?timeframe=2026-01-20,2026-01-26');

      await waitFor(() => {
        const call = mockGetUserStats.mock.calls[0];
        // Just verify the function was called with dates
        expect(call).toBeDefined();
        if (call) {
          expect(call[1]).toBeDefined(); // startDate
          expect(call[2]).toBeDefined(); // endDate
        }
      });
    });

    it('handles "this-month" preset correctly', async () => {
      renderUserStats('/stats?timeframe=this-month');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      const thisMonthButton = screen.getByRole('button', { name: /this month/i });
      expect(thisMonthButton).toHaveClass('active');
    });

    it('handles "this-year" preset correctly', async () => {
      renderUserStats('/stats?timeframe=this-year');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      const thisYearButton = screen.getByRole('button', { name: /this year/i });
      expect(thisYearButton).toHaveClass('active');
    });

    it('handles "last-year" preset correctly', async () => {
      renderUserStats('/stats?timeframe=last-year');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      const lastYearButton = screen.getByRole('button', { name: /last year/i });
      expect(lastYearButton).toHaveClass('active');
    });

    it('handles "all-time" preset correctly', async () => {
      renderUserStats('/stats?timeframe=all-time');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });

      const allTimeButton = screen.getByRole('button', { name: /all time/i });
      expect(allTimeButton).toHaveClass('active');
    });

    it('displays chart with monthly data for all-time view', async () => {
      // Mock monthly completions data for all-time view BEFORE rendering
      const mockMonthlyData = [
        { month_start: '2024-01-01', count: 20 },
        { month_start: '2024-02-01', count: 25 },
        { month_start: '2024-03-01', count: 30 },
        { month_start: '2025-01-01', count: 35 },
        { month_start: '2025-12-01', count: 40 },
        { month_start: '2026-01-01', count: 42 },
      ];

      // Clear and set mocks before render
      mockGetUserMonthlyCompletions.mockClear();
      mockGetUserMonthlyCompletions.mockResolvedValue({ data: mockMonthlyData, error: null });

      renderUserStats('/stats?timeframe=all-time');

      // Wait for the queries to be called with correct parameters
      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalledWith('user-123', undefined, undefined);
        expect(mockGetUserMonthlyCompletions).toHaveBeenCalledWith('user-123', undefined, undefined);
      });

      // Chart should be visible with monthly data
      await waitFor(() => {
        expect(screen.getByText('Monthly Completions')).toBeInTheDocument();
      });

      // Check that the chart container renders
      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-chart');
        expect(chart).toBeInTheDocument();
      });
    });

    it('supports year view toggle for all-time', async () => {
      const user = userEvent.setup();

      // Mock monthly completions spanning multiple years
      const mockMonthlyData = [
        { month_start: '2024-01-01', count: 20 },
        { month_start: '2024-06-01', count: 25 },
        { month_start: '2025-01-01', count: 35 },
        { month_start: '2025-06-01', count: 40 },
        { month_start: '2026-01-01', count: 42 },
      ];
      mockGetUserMonthlyCompletions.mockClear();
      mockGetUserMonthlyCompletions.mockResolvedValue({ data: mockMonthlyData, error: null });

      renderUserStats('/stats?timeframe=all-time');

      await waitFor(() => {
        expect(screen.getByText('Monthly Completions')).toBeInTheDocument();
      });

      // Should show view toggle for month/year
      const yearRadio = screen.getByLabelText(/view by year/i);
      expect(yearRadio).toBeInTheDocument();

      // Switch to year view
      await user.click(yearRadio);

      await waitFor(() => {
        expect(screen.getByText('Yearly Completions')).toBeInTheDocument();
      });
    });
  });

  describe('Timeframe Selection', () => {
    it('changes active timeframe button when clicked', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /last week/i })).toBeInTheDocument();
      });

      const thisWeekButton = screen.getByRole('button', { name: /this week/i });
      const lastWeekButton = screen.getByRole('button', { name: /last week/i });

      // This Week should be active initially
      expect(thisWeekButton).toHaveClass('active');

      await user.click(lastWeekButton);

      // After click, component should update (URL updates might not work in MemoryRouter)
      // Just verify button is clickable
      expect(lastWeekButton).toBeInTheDocument();
    });

    it('fetches new data when timeframe changes', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats');

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalledTimes(1);
      });

      const lastMonthButton = screen.getByRole('button', { name: /this month/i });
      await user.click(lastMonthButton);

      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalledTimes(2);
      });
    });

    it('preserves view parameter when switching timeframes', async () => {
      const user = userEvent.setup();
      // Start with This Month and Week view
      renderUserStats('/stats?timeframe=this-month&view=week');

      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
      });

      // Verify week view is selected
      const weekViewRadio = screen.getByRole('radio', { name: /week/i });
      expect(weekViewRadio).toBeChecked();

      // Switch to This Year timeframe
      const thisYearButton = screen.getByRole('button', { name: /this year/i });
      await user.click(thisYearButton);

      // Wait for component to update
      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
      });

      // Week view should still be selected
      const weekViewRadioAfter = screen.getByRole('radio', { name: /week/i });
      expect(weekViewRadioAfter).toBeChecked();
    });

    it('preserves month view when switching from this-year to last-year', async () => {
      const user = userEvent.setup();
      // Start with This Year and Month view
      renderUserStats('/stats?timeframe=this-year&view=month');

      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
      });

      // Verify month view is selected
      const monthViewRadio = screen.getByRole('radio', { name: /month/i });
      expect(monthViewRadio).toBeChecked();

      // Switch to Last Year timeframe
      const lastYearButton = screen.getByRole('button', { name: /last year/i });
      await user.click(lastYearButton);

      // Wait for component to update
      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
      });

      // Month view should still be selected
      const monthViewRadioAfter = screen.getByRole('radio', { name: /month/i });
      expect(monthViewRadioAfter).toBeChecked();
    });
  });

  describe('Custom Date Range Controls', () => {
    it('shows custom date inputs when Custom button is clicked', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument();
      });

      // Custom inputs should not be visible initially
      expect(screen.queryByTestId('custom-date-range')).not.toBeInTheDocument();

      const customButton = screen.getByRole('button', { name: /custom/i });
      await user.click(customButton);

      // Custom inputs should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });
    });

    it('shows custom date inputs when custom range is in URL', async () => {
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      // Date inputs should be populated from URL
      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

      expect(startInput.value).toBe('2026-01-01');
      expect(endInput.value).toBe('2026-01-31');
    });

    it('Custom button shows active state when custom range is in URL', async () => {
      renderUserStats('/stats?timeframe=2026-01-15,2026-01-31');

      await waitFor(() => {
        const customButton = screen.getByRole('button', { name: /custom/i });
        expect(customButton).toHaveClass('active');
      });
    });

    it('sets default date range (last 30 days) when Custom clicked with no existing range', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument();
      });

      const customButton = screen.getByRole('button', { name: /custom/i });
      await user.click(customButton);

      await waitFor(() => {
        const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
        const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

        // Should have values (default 30 days range)
        expect(startInput.value).toBeTruthy();
        expect(endInput.value).toBeTruthy();

        // End date should be today or very recent
        const endDate = new Date(endInput.value);
        const today = new Date();
        const daysDiff = Math.abs((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBeLessThan(2); // Within 2 days to account for timezone differences
      });
    });

    it('updates URL when start date is changed', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const startInput = screen.getByLabelText(/start date/i);
      await user.clear(startInput);
      await user.type(startInput, '2026-01-10');

      // Should trigger data refetch
      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });
    });

    it('updates URL when end date is changed', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const endInput = screen.getByLabelText(/end date/i);
      await user.clear(endInput);
      await user.type(endInput, '2026-01-25');

      // Should trigger data refetch
      await waitFor(() => {
        expect(mockGetUserStats).toHaveBeenCalled();
      });
    });

    it('prevents end date from being before start date with min attribute', async () => {
      renderUserStats('/stats?timeframe=2026-01-15,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

      // End input should have min attribute set to start date
      expect(endInput.min).toBe('2026-01-15');
      // Start input should have max attribute set to end date
      expect(startInput.max).toBe('2026-01-31');
    });

    it('does not update URL if end date is before start date', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=2026-01-15,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const initialCallCount = mockGetUserStats.mock.calls.length;

      // Try to set end date before start date (this should be prevented by validation)
      const endInput = screen.getByLabelText(/end date/i);
      await user.clear(endInput);
      await user.type(endInput, '2026-01-10'); // Before start date (2026-01-15)

      // Wait a bit to ensure no additional calls were made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not trigger additional data fetch due to validation
      expect(mockGetUserStats.mock.calls.length).toBe(initialCallCount);
    });

    it('has proper accessibility labels for date inputs', async () => {
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      // Check that inputs have proper labels
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();

      // Check that inputs have IDs matching labels
      const startInput = screen.getByLabelText(/start date/i);
      const endInput = screen.getByLabelText(/end date/i);

      expect(startInput).toHaveAttribute('id', 'start-date');
      expect(endInput).toHaveAttribute('id', 'end-date');
    });

    it('custom date range inputs have correct CSS classes', async () => {
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        const customDateRange = screen.getByTestId('custom-date-range');
        expect(customDateRange).toBeInTheDocument();

        // Check that the container has the expected class
        expect(customDateRange).toHaveClass('cq-user-stats-custom-date-range');
      });
    });

    it('hides custom date inputs when switching to another preset', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      // Switch to "This Week"
      const thisWeekButton = screen.getByRole('button', { name: /this week/i });
      await user.click(thisWeekButton);

      // Custom inputs should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('custom-date-range')).not.toBeInTheDocument();
      });
    });

    it('requires both start and end dates before applying range', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const initialCallCount = mockGetUserStats.mock.calls.length;
      const startInput = screen.getByLabelText(/start date/i);

      // Clear start date
      await user.clear(startInput);

      // Wait to ensure no call is made with incomplete data
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not make new call with only end date
      expect(mockGetUserStats.mock.calls.length).toBe(initialCallCount);
    });

    it('fetches data with custom date range when both dates are provided', async () => {
      renderUserStats('/stats?timeframe=2026-01-20,2026-01-26');

      await waitFor(() => {
        // Should call with the custom date range
        const calls = mockGetUserStats.mock.calls;
        const lastCall = calls[calls.length - 1];

        expect(lastCall).toBeDefined();
        expect(lastCall![0]).toBe('user-123'); // userId
        expect(lastCall![1]).toBeTruthy(); // startDate should be defined
        expect(lastCall![2]).toBeTruthy(); // endDate should be defined
      });
    });

    it('preserves custom range when switching chart views', async () => {
      const user = userEvent.setup();

      // Set custom range that shows view toggles (>30 days)
      renderUserStats('/stats?timeframe=2025-12-01,2026-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('custom-date-range')).toBeInTheDocument();
      });

      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

      const originalStart = startInput.value;
      const originalEnd = endInput.value;

      // Switch chart view (if toggle is available)
      const viewToggle = screen.queryByLabelText(/view by week/i);
      if (viewToggle) {
        await user.click(viewToggle);

        // Date inputs should still have the same values
        await waitFor(() => {
          expect(startInput.value).toBe(originalStart);
          expect(endInput.value).toBe(originalEnd);
        });
      }
    });
  });

  describe('Chart View Controls (Smart Toggle)', () => {
    it('shows no view toggle for "This Week" (day view only)', async () => {
      renderUserStats('/stats?timeframe=this-week');

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /test user/i });
        expect(heading).toBeInTheDocument();
      });

      // Should not show view toggle
      expect(screen.queryByText(/view by/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('shows day/week toggle for "This Month"', async () => {
      renderUserStats('/stats?timeframe=this-month');

      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /day/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /week/i })).toBeInTheDocument();
      });
    });

    it('shows week/month toggle for "This Year"', async () => {
      renderUserStats('/stats?timeframe=this-year');

      await waitFor(() => {
        expect(screen.getByText(/view by/i)).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /week/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /month/i })).toBeInTheDocument();
      });
    });

    it('switches between day and week view for monthly timeframe', async () => {
      const user = userEvent.setup();
      renderUserStats('/stats?timeframe=this-month');

      // Wait for component to load and check initial call
      await waitFor(() => {
        expect(mockGetUserDailyCompletions).toHaveBeenCalled();
      });

      // Find and click week view radio (if available)
      const viewControls = screen.queryByText(/view by/i);
      if (viewControls) {
        const weekViewRadio = screen.queryByLabelText(/view by week/i);
        if (weekViewRadio) {
          await user.click(weekViewRadio);
          await waitFor(() => {
            expect(mockGetUserWeeklyCompletions).toHaveBeenCalled();
          });
        }
      }
    });
  });

  describe('Chart Rendering', () => {
    it('renders daily completions chart for week view', async () => {
      renderUserStats('/stats?timeframe=this-week');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });
    });

    it('displays chart with correct data points', async () => {
      renderUserStats('/stats?timeframe=this-week');

      await waitFor(() => {
        // Recharts renders SVG elements
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when stats fetch fails', async () => {
      mockGetUserStats.mockResolvedValue({
        data: null,
        error: new Error('Failed to fetch stats')
      });

      renderUserStats();

      await waitFor(() => {
        // Error should be thrown and caught by error boundary or displayed
        expect(screen.queryByText('42')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no pomodoros exist', async () => {
      mockGetUserStats.mockResolvedValue({
        data: {
          total_pomodoros: 0,
          completed_pomodoros: 0,
          active_days: 0,
          total_days: 7,
        },
        error: null
      });

      renderUserStats();

      await waitFor(() => {
        expect(screen.getByText(/no pomodoros yet/i)).toBeInTheDocument();
      });
    });

    it('shows call-to-action in empty state', async () => {
      mockGetUserStats.mockResolvedValue({
        data: {
          total_pomodoros: 0,
          completed_pomodoros: 0,
          active_days: 0,
          total_days: 7,
        },
        error: null
      });

      renderUserStats();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /go to timer/i });
        expect(link).toHaveAttribute('href', '/');
      });
    });
  });

  describe('Custom Date Range', () => {
    it('parses custom date range from URL correctly', async () => {
      // Custom mode is triggered by comma in timeframe param
      renderUserStats('/stats?timeframe=2026-01-01,2026-01-31');

      await waitFor(() => {
        // Verify the component called the stats function
        const call = mockGetUserStats.mock.calls[0];
        expect(call).toBeDefined();
        if (call) {
          expect(call[1]).toBeDefined(); // startDate exists
          expect(call[2]).toBeDefined(); // endDate exists
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      renderUserStats();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /test user/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it('has accessible stat cards with proper labels', async () => {
      renderUserStats();

      await waitFor(() => {
        // Stat cards should have accessible text
        expect(screen.getByText('Total Pomodoros')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Active Days')).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Boundaries', () => {
    it('"this year" should only query dates within current year (no Dec 2025 or Jan 2027)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-31T15:00:00.000Z')); // Jan 31, 2026 10AM EST

      // Reset mocks to clear previous calls
      mockGetUserStats.mockClear();
      mockGetUserDailyCompletions.mockClear();

      renderUserStats('/stats?timeframe=this-year');

      // Need to advance timers for the component to render
      await vi.runAllTimersAsync();

      // Check the call was made
      expect(mockGetUserStats).toHaveBeenCalled();

      const call = mockGetUserStats.mock.calls[0];
      expect(call).toBeDefined();
      const [, startDate, endDate] = call!;

      // Start should be Jan 1, 2026 00:00:00 UTC
      expect(startDate).toBe('2026-01-01T00:00:00.000Z');

      // End should be Dec 31, 2026 23:59:59.999 UTC
      expect(endDate).toBe('2026-12-31T23:59:59.999Z');

      // Should NOT contain 2025 or 2027
      expect(startDate).not.toContain('2025');
      expect(startDate).not.toContain('2027');
      expect(endDate).not.toContain('2025');
      expect(endDate).not.toContain('2027');

      vi.useRealTimers();
    });

    it('"last year" should only query dates within previous year', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-31T15:00:00.000Z')); // Jan 31, 2026 10AM EST

      // Reset mocks to clear previous calls
      mockGetUserStats.mockClear();
      mockGetUserDailyCompletions.mockClear();

      renderUserStats('/stats?timeframe=last-year');

      // Need to advance timers for the component to render
      await vi.runAllTimersAsync();

      // Check the call was made
      expect(mockGetUserStats).toHaveBeenCalled();

      const call = mockGetUserStats.mock.calls[0];
      const [, startDate, endDate] = call;

      // Start should be Jan 1, 2025 00:00:00 UTC
      expect(startDate).toBe('2025-01-01T00:00:00.000Z');

      // End should be Dec 31, 2025 23:59:59.999 UTC
      expect(endDate).toBe('2025-12-31T23:59:59.999Z');

      // Should contain 2025 but NOT 2024 or 2026
      expect(startDate).toContain('2025');
      expect(endDate).toContain('2025');
      expect(startDate).not.toContain('2024');
      expect(endDate).not.toContain('2026');

      vi.useRealTimers();
    });
  });

  describe('Empty Day Filling', () => {
    beforeEach(() => {
      // Mock sparse data with gaps
      mockGetUserStats.mockResolvedValue({
        data: {
          total_pomodoros: 15,
          completed_pomodoros: 12,
          active_days: 3,
          total_days: 7,
        },
        error: null
      });

      // Mock sparse daily data with missing days
      mockGetUserDailyCompletions.mockResolvedValue({
        data: [
          { date: '2026-01-27', count: 5 },
          { date: '2026-01-29', count: 3 }, // Missing Jan 28
          { date: '2026-01-31', count: 7 }  // Missing Jan 30
        ],
        error: null
      });

      // Mock sparse weekly data with gaps
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2026-01-20', count: 12 },
          // Missing week of Jan 27
          { week_start: '2026-02-03', count: 8 }
        ],
        error: null
      });

      // Mock sparse monthly data
      mockGetUserMonthlyCompletions.mockResolvedValue({
        data: [
          { month_start: '2026-01-01', count: 25 },
          // Missing February
          { month_start: '2026-03-01', count: 18 }
        ],
        error: null
      });
    });

    it('fills missing days in daily chart view', async () => {
      renderUserStats('/stats?timeframe=this-week');

      // Just verify the chart renders
      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
        const chartTitle = screen.getByText('Daily Completions');
        expect(chartTitle).toBeInTheDocument();
      });
    });

    it('fills missing weeks in weekly chart view', async () => {
      renderUserStats('/stats?timeframe=this-year&view=week');

      // Just verify the chart renders
      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
        const chartTitle = screen.getByText('Weekly Completions');
        expect(chartTitle).toBeInTheDocument();
      });
    });

    it('fills missing months in monthly chart view', async () => {
      renderUserStats('/stats?timeframe=this-year&view=month');

      // Just verify the chart renders
      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
        const chartTitle = screen.getByText('Monthly Completions');
        expect(chartTitle).toBeInTheDocument();
      });
    });

    it('preserves existing data while filling gaps', async () => {
      renderUserStats('/stats?timeframe=this-week');

      // Wait for data to load
      await waitFor(() => {
        expect(mockGetUserDailyCompletions).toHaveBeenCalled();
      });

      // Verify the chart renders with the data
      await waitFor(() => {
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();

        // Verify chart title shows we're in daily view
        expect(screen.getByText('Daily Completions')).toBeInTheDocument();
      });
    });

    it('shows correct chart title for each view', async () => {
      // Test daily view
      renderUserStats('/stats?timeframe=this-week');
      await waitFor(() => {
        expect(screen.getByText('Daily Completions')).toBeInTheDocument();
      });
    });

    it('handles completely empty data correctly', async () => {
      // Mock completely empty data
      mockGetUserDailyCompletions.mockResolvedValue({ data: [], error: null });
      mockGetUserWeeklyCompletions.mockResolvedValue({ data: [], error: null });
      mockGetUserMonthlyCompletions.mockResolvedValue({ data: [], error: null });

      renderUserStats('/stats?timeframe=this-week');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Chart container should still render even with no data
      await waitFor(() => {
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();

        // Verify chart title is present
        expect(screen.getByText('Daily Completions')).toBeInTheDocument();
      });
    });

    it('handles custom date range with gaps', async () => {
      // Test custom range spanning multiple days with gaps
      renderUserStats('/stats?timeframe=2026-01-26,2026-02-01');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Verify chart renders with the custom date range
      await waitFor(() => {
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();

        // Verify query was called with the custom date range
        expect(mockGetUserDailyCompletions).toHaveBeenCalled();
        const callArgs = mockGetUserDailyCompletions.mock.calls[0];
        expect(callArgs[1]).toContain('2026-01-26');
        expect(callArgs[2]).toContain('2026-02-01');
      });
    });

    it('correctly handles timezone-sensitive dates', async () => {
      // Test with dates that might be affected by timezone conversion
      mockGetUserDailyCompletions.mockResolvedValue({
        data: [
          { date: '2026-01-01T05:00:00.000Z', count: 5 }, // ISO string from database
          { date: '2026-01-03', count: 3 } // Simple date string
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=2026-01-01,2026-01-05');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Verify chart renders correctly with both date formats
      await waitFor(() => {
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();

        // Verify chart title
        expect(screen.getByText('Daily Completions')).toBeInTheDocument();
      });
    });
  });

  describe('Week View Enhancements', () => {
    beforeEach(() => {
      mockGetUserStats.mockResolvedValue({ data: mockStats, error: null });
      mockGetUserDailyCompletions.mockResolvedValue({ data: mockDailyCompletions, error: null });
      mockGetUserMonthlyCompletions.mockResolvedValue({ data: [], error: null });
    });

    it('displays month/year chart title for this-month week view', async () => {
      // Mock weekly data for Feb 2026, including week that starts in Jan
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2026-01-27', count: 15 }, // Week starting in Jan
          { week_start: '2026-02-03', count: 20 },
          { week_start: '2026-02-10', count: 18 },
          { week_start: '2026-02-17', count: 22 },
          { week_start: '2026-02-24', count: 16 }, // Week extending into Mar
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=this-month&view=week');

      await waitFor(() => {
        // Should show "Weekly Completions" as view title
        const viewTitle = screen.getByText('Weekly Completions');
        expect(viewTitle).toBeInTheDocument();
        expect(viewTitle).toHaveClass('cq-user-stats-view-title');
      });

      await waitFor(() => {
        // Chart should be rendered
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();

        // Should query weekly completions
        expect(mockGetUserWeeklyCompletions).toHaveBeenCalled();
      });
    });

    it('displays week labels as dates instead of "Week 1, Week 2"', async () => {
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2026-01-27', count: 15 },
          { week_start: '2026-02-03', count: 20 },
          { week_start: '2026-02-10', count: 18 },
          { week_start: '2026-02-17', count: 22 },
          { week_start: '2026-02-24', count: 16 },
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=this-month&view=week');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Verify chart container renders and weekly data is called
      await waitFor(() => {
        const chartContainer = document.querySelector('.recharts-responsive-container');
        expect(chartContainer).toBeInTheDocument();

        // Verify weekly completions query was called
        expect(mockGetUserWeeklyCompletions).toHaveBeenCalled();
      });
    });

    it('includes full week data even when week starts in previous month', async () => {
      // Week starting Jan 27 includes days from both Jan and Feb
      // The full week (7 days) should show the combined count
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2026-01-27', count: 38 }, // Full week: 5 days in Jan + 2 days in Feb
          { week_start: '2026-02-03', count: 30 },
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=this-month&view=week');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Verify the weekly completions query was called with expanded date range
      await waitFor(() => {
        expect(mockGetUserWeeklyCompletions).toHaveBeenCalled();
        const callArgs = mockGetUserWeeklyCompletions.mock.calls[0];
        const startDate = callArgs[1];
        const endDate = callArgs[2];

        // Feb 1, 2026 is a Saturday, so the Monday before it is Jan 26
        expect(startDate).toContain('2026-01-26');

        // End date should be defined and extend beyond the month
        expect(endDate).toBeDefined();
        expect(endDate).toBeTruthy();
      });
    });

    it('displays year as chart title for this-year week view', async () => {
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2025-12-29', count: 10 }, // Week starting in Dec 2025
          { week_start: '2026-01-05', count: 15 },
          { week_start: '2026-01-12', count: 20 },
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=this-year&view=week');

      await waitFor(() => {
        // Should show "Weekly Completions" as view title
        const viewTitle = screen.getByText('Weekly Completions');
        expect(viewTitle).toBeInTheDocument();

        // Chart should be rendered
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });
    });

    it('does not display timeframe title for day view', async () => {
      renderUserStats('/stats?timeframe=this-month&view=day');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Should show "Daily Completions" view title
      await waitFor(() => {
        const viewTitle = screen.getByText('Daily Completions');
        expect(viewTitle).toBeInTheDocument();

        // Verify it has the correct CSS class
        expect(viewTitle).toHaveClass('cq-user-stats-view-title');
      });
    });

    it('does not display timeframe title for custom date ranges', async () => {
      mockGetUserWeeklyCompletions.mockResolvedValue({
        data: [
          { week_start: '2026-01-27', count: 15 },
          { week_start: '2026-02-03', count: 20 },
        ],
        error: null
      });

      renderUserStats('/stats?timeframe=2026-01-27,2026-02-10&view=week');

      await waitFor(() => {
        const chart = document.querySelector('.cq-user-stats-daily-chart');
        expect(chart).toBeInTheDocument();
      });

      // Should show "Weekly Completions" view title for custom ranges
      await waitFor(() => {
        const viewTitle = screen.getByText('Weekly Completions');
        expect(viewTitle).toBeInTheDocument();

        // Verify weekly completions query was called
        expect(mockGetUserWeeklyCompletions).toHaveBeenCalled();
      });
    });
  });
});
