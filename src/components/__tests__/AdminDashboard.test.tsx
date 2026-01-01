import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '../AdminDashboard';
import { AuthContext } from '../../contexts/AuthContext';
import * as useAdminDashboardHooks from '../../hooks/useAdminDashboard';

vi.mock('../../hooks/useAdminDashboard', () => ({
  useAdminStats: vi.fn(),
  useDailyPomodoros: vi.fn(),
  useDailySignups: vi.fn(),
}));

const mockHooks = vi.mocked(useAdminDashboardHooks);

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockAdminUser = {
  id: 'admin-123',
  user_name: 'Admin User',
  email: 'admin@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  is_admin: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockStats = {
  total_users: 1000,
  new_users: 50,
  completed_pomodoros: 5000,
  total_pomodoros: 5500,
  total_likes: 2000,
  total_comments: 500,
  active_users: 300,
};

const mockDailyPomodoros = [
  { date: '2024-01-01', count: '100' },
  { date: '2024-01-02', count: '150' },
  { date: '2024-01-03', count: '120' },
];

const mockDailySignups = [
  { date: '2024-01-01', count: '10' },
  { date: '2024-01-02', count: '15' },
  { date: '2024-01-03', count: '12' },
];

const renderAdminDashboard = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{
        user: mockAdminUser,
        userProfile: mockAdminUser,
        loading: false,
        session: null,
      }}>
        <AdminDashboard />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('AdminDashboard CSS behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockHooks.useAdminStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    });

    mockHooks.useDailyPomodoros.mockReturnValue({
      data: mockDailyPomodoros,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    });

    mockHooks.useDailySignups.mockReturnValue({
      data: mockDailySignups,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    });
  });

  describe('initial render and layout', () => {
    it('renders admin dashboard container', () => {
      const { container } = renderAdminDashboard();

      const dashboard = container.querySelector('.cq-admin-dashboard');
      expect(dashboard).toBeInTheDocument();
      expect(dashboard).toHaveClass('min-h-screen', 'bg-gray-50', 'p-6');
    });

    it('renders dashboard container with max width', () => {
      const { container } = renderAdminDashboard();

      const containerEl = container.querySelector('.cq-admin-dashboard-container');
      expect(containerEl).toBeInTheDocument();
      expect(containerEl).toHaveClass('max-w-7xl', 'mx-auto');
    });

    it('displays admin dashboard title and subtitle', () => {
      renderAdminDashboard();

      const title = screen.getByText('Admin Dashboard');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('cq-admin-title', 'text-3xl', 'font-bold', 'text-gray-900');

      const subtitle = screen.getByText('Monitor app metrics and user activity');
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveClass('cq-admin-subtitle', 'mt-2', 'text-gray-600');
    });

    it('renders time range selector', () => {
      const { container } = renderAdminDashboard();

      const selector = container.querySelector('.cq-admin-time-range-selector');
      expect(selector).toBeInTheDocument();
    });

    it('renders time range buttons', () => {
      const { container } = renderAdminDashboard();

      const buttonsContainer = container.querySelector('.cq-admin-time-range-buttons');
      expect(buttonsContainer).toBeInTheDocument();

      const buttons = container.querySelectorAll('.cq-admin-time-range-button');
      expect(buttons.length).toBe(4); // 7d, 30d, All time, Custom
    });
  });

  describe('stat cards', () => {
    it('renders stats grid with correct classes', () => {
      const { container } = renderAdminDashboard();

      const statsGrid = container.querySelector('.cq-admin-stats-grid');
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6', 'mb-8');
    });

    it('renders all stat cards', () => {
      const { container } = renderAdminDashboard();

      const statCards = container.querySelectorAll('.cq-admin-stat-card');
      expect(statCards.length).toBe(4);
    });

    it('displays stat card titles', () => {
      renderAdminDashboard();

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Pomodoros Completed')).toBeInTheDocument();
      expect(screen.getByText('Engagement')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('displays stat card values', () => {
      renderAdminDashboard();

      const statValues = screen.getAllByText(/^1,000$|^5,000$|^2,500$|^300$/);
      expect(statValues.length).toBeGreaterThan(0);
    });

    it('displays stat card subtitles when available', () => {
      renderAdminDashboard();

      const subtitle = screen.getByText(/\+50 new in period/);
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveClass('cq-admin-stat-subtitle');
    });
  });

  describe('time range selection', () => {
    it('selects "Last 30 days" by default', () => {
      const { container } = renderAdminDashboard();

      const buttons = container.querySelectorAll('.cq-admin-time-range-button');
      const thirtyDayButton = Array.from(buttons).find(btn => btn.textContent === 'Last 30 days');
      expect(thirtyDayButton).toHaveClass('bg-red-600', 'text-white');
    });

    it('allows selecting different time ranges', async () => {
      renderAdminDashboard();
      const user = userEvent.setup();

      const sevenDayButton = screen.getByRole('button', { name: 'Last 7 days' });
      await user.click(sevenDayButton);

      await waitFor(() => {
        expect(sevenDayButton).toHaveClass('bg-red-600', 'text-white');
      });
    });

    it('shows custom date inputs when custom range is selected', async () => {
      const { container } = renderAdminDashboard();
      const user = userEvent.setup();

      const customButton = screen.getByRole('button', { name: 'Custom' });
      await user.click(customButton);

      await waitFor(() => {
        const customRange = container.querySelector('.cq-admin-custom-date-range');
        expect(customRange).toBeInTheDocument();
      });
    });

    it('renders custom date inputs with correct classes', async () => {
      renderAdminDashboard();
      const user = userEvent.setup();

      const customButton = screen.getByRole('button', { name: 'Custom' });
      await user.click(customButton);

      await waitFor(() => {
        const startDate = document.querySelector('.cq-admin-custom-start-date');
        const endDate = document.querySelector('.cq-admin-custom-end-date');
        expect(startDate).toBeInTheDocument();
        expect(endDate).toBeInTheDocument();
      });
    });
  });

  describe('charts', () => {
    it('renders charts grid with correct classes', () => {
      const { container } = renderAdminDashboard();

      const chartsGrid = container.querySelector('.cq-admin-charts-grid');
      expect(chartsGrid).toBeInTheDocument();
      expect(chartsGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
    });

    it('renders pomodoros chart container', () => {
      const { container } = renderAdminDashboard();

      const chart = container.querySelector('.cq-admin-pomodoros-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveClass('bg-white', 'rounded-lg', 'shadow-md', 'p-6');
    });

    it('renders signups chart container', () => {
      const { container } = renderAdminDashboard();

      const chart = container.querySelector('.cq-admin-signups-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveClass('bg-white', 'rounded-lg', 'shadow-md', 'p-6');
    });

    it('displays chart titles', () => {
      renderAdminDashboard();

      expect(screen.getByText('Daily Pomodoros Completed')).toBeInTheDocument();
      expect(screen.getByText('Daily New Users')).toBeInTheDocument();
    });

    it('renders chart content when data is available', () => {
      const { container } = renderAdminDashboard();

      const pomodoroChartContent = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-content');
      const signupChartContent = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-content');

      expect(pomodoroChartContent).toBeInTheDocument();
      expect(signupChartContent).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('shows loading state for stat cards', () => {
      mockHooks.useAdminStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      const { container } = renderAdminDashboard();

      const loadingElements = container.querySelectorAll('.cq-admin-stat-loading');
      expect(loadingElements.length).toBe(4);
    });

    it('shows loading state for pomodoros chart', () => {
      mockHooks.useDailyPomodoros.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      const { container } = renderAdminDashboard();

      const loadingElement = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-loading');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'bg-gray-100', 'rounded', 'animate-pulse');
    });

    it('shows loading state for signups chart', () => {
      mockHooks.useDailySignups.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      const { container } = renderAdminDashboard();

      const loadingElement = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-loading');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'bg-gray-100', 'rounded', 'animate-pulse');
    });
  });

  describe('empty states', () => {
    it('shows empty state when no pomodoro data', () => {
      mockHooks.useDailyPomodoros.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { container } = renderAdminDashboard();

      const emptyState = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-empty');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent('No data for selected period');
    });

    it('shows empty state when no signup data', () => {
      mockHooks.useDailySignups.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { container } = renderAdminDashboard();

      const emptyState = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-empty');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent('No data for selected period');
    });
  });

  describe('stat card structure', () => {
    it('renders stat card with title, value, and subtitle classes', () => {
      const { container } = renderAdminDashboard();

      const statCard = container.querySelector('.cq-admin-stat-card');
      expect(statCard).toBeInTheDocument();

      const title = statCard?.querySelector('.cq-admin-stat-title');
      const value = statCard?.querySelector('.cq-admin-stat-value');

      expect(title).toBeInTheDocument();
      expect(value).toBeInTheDocument();
    });

    it('stat card title has correct classes', () => {
      const { container } = renderAdminDashboard();

      const title = container.querySelector('.cq-admin-stat-title');
      expect(title).toHaveClass('text-sm', 'font-medium', 'text-gray-500', 'uppercase', 'tracking-wide');
    });

    it('stat card value has correct classes', () => {
      const { container } = renderAdminDashboard();

      const value = container.querySelector('.cq-admin-stat-value');
      expect(value).toHaveClass('mt-2', 'text-3xl', 'font-bold', 'text-gray-900');
    });
  });
});

