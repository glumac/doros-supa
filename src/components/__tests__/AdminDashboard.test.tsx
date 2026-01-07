import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { AdminDashboard } from '../AdminDashboard';
import { AuthContext } from '../../contexts/AuthContext';
import type { User, RecentActiveUser } from '../../types/models';
import * as queries from '../../lib/queries';

// Mock the query functions (following agents.md convention)
vi.mock('../../lib/queries', async (importOriginal) => {
  const original = await importOriginal<typeof queries>();
  return {
    ...original,
    getAdminStats: vi.fn(),
    getDailyPomodoroCounts: vi.fn(),
    getDailyUserSignups: vi.fn(),
    getRecentActiveUsers: vi.fn(),
  };
});

const mockGetAdminStats = queries.getAdminStats as Mock;
const mockGetDailyPomodoroCounts = queries.getDailyPomodoroCounts as Mock;
const mockGetDailyUserSignups = queries.getDailyUserSignups as Mock;
const mockGetRecentActiveUsers = queries.getRecentActiveUsers as Mock;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock user profile (from users table)
const mockAdminUserProfile: User = {
  id: 'admin-123',
  user_name: 'Admin User',
  email: 'admin@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  is_admin: true,
  created_at: '2024-01-01T00:00:00Z',
};

// Mock Supabase Auth user (minimal required fields for testing)
const mockAdminAuthUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as SupabaseAuthUser;

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
  { date: '2024-01-01', count: 100 },
  { date: '2024-01-02', count: 150 },
  { date: '2024-01-03', count: 120 },
];

const mockDailySignups = [
  { date: '2024-01-01', count: 10 },
  { date: '2024-01-02', count: 15 },
  { date: '2024-01-03', count: 12 },
];

const renderAdminDashboard = () => {
  const queryClient = createTestQueryClient();

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{
          user: mockAdminAuthUser,
          userProfile: mockAdminUserProfile,
          loading: false,
          session: null,
          refreshUserProfile: vi.fn(),
        }}>
          <AdminDashboard />
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('AdminDashboard CSS behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations - returning { data, error } structure per agents.md
    mockGetAdminStats.mockResolvedValue({ data: mockStats, error: null });
    mockGetDailyPomodoroCounts.mockResolvedValue({ data: mockDailyPomodoros, error: null });
    mockGetDailyUserSignups.mockResolvedValue({ data: mockDailySignups, error: null });
    mockGetRecentActiveUsers.mockResolvedValue({ data: [] as RecentActiveUser[], error: null });
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

    it('displays stat card values', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        const statValues = screen.getAllByText(/^1,000$|^5,000$|^2,500$|^300$/);
        expect(statValues.length).toBeGreaterThan(0);
      });
    });

    it('displays stat card subtitles when available', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        const subtitle = screen.getByText(/\+50 new in period/);
        expect(subtitle).toBeInTheDocument();
        expect(subtitle).toHaveClass('cq-admin-stat-subtitle');
      });
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

    it('renders chart content when data is available', async () => {
      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const pomodoroChartContent = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-content');
        const signupChartContent = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-content');

        expect(pomodoroChartContent).toBeInTheDocument();
        expect(signupChartContent).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state for stat cards', async () => {
      // Use a promise that never resolves to simulate loading
      mockGetAdminStats.mockReturnValue(new Promise(() => {}));

      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const loadingElements = container.querySelectorAll('.cq-admin-stat-loading');
        expect(loadingElements.length).toBe(4);
      });
    });

    it('shows loading state for pomodoros chart', async () => {
      mockGetDailyPomodoroCounts.mockReturnValue(new Promise(() => {}));

      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const loadingElement = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-loading');
        expect(loadingElement).toBeInTheDocument();
        expect(loadingElement).toHaveClass('h-64', 'bg-gray-100', 'rounded', 'animate-pulse');
      });
    });

    it('shows loading state for signups chart', async () => {
      mockGetDailyUserSignups.mockReturnValue(new Promise(() => {}));

      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const loadingElement = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-loading');
        expect(loadingElement).toBeInTheDocument();
        expect(loadingElement).toHaveClass('h-64', 'bg-gray-100', 'rounded', 'animate-pulse');
      });
    });
  });

  describe('empty states', () => {
    it('shows empty state when no pomodoro data', async () => {
      mockGetDailyPomodoroCounts.mockResolvedValue({ data: [], error: null });

      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const emptyState = container.querySelector('.cq-admin-pomodoros-chart .cq-admin-chart-empty');
        expect(emptyState).toBeInTheDocument();
        expect(emptyState).toHaveTextContent('No data for selected period');
      });
    });

    it('shows empty state when no signup data', async () => {
      mockGetDailyUserSignups.mockResolvedValue({ data: [], error: null });

      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const emptyState = container.querySelector('.cq-admin-signups-chart .cq-admin-chart-empty');
        expect(emptyState).toBeInTheDocument();
        expect(emptyState).toHaveTextContent('No data for selected period');
      });
    });
  });

  describe('stat card structure', () => {
    it('renders stat card with title, value, and subtitle classes', async () => {
      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const statCard = container.querySelector('.cq-admin-stat-card');
        expect(statCard).toBeInTheDocument();

        const title = statCard?.querySelector('.cq-admin-stat-title');
        const value = statCard?.querySelector('.cq-admin-stat-value');

        expect(title).toBeInTheDocument();
        expect(value).toBeInTheDocument();
      });
    });

    it('stat card title has correct classes', () => {
      const { container } = renderAdminDashboard();

      const title = container.querySelector('.cq-admin-stat-title');
      expect(title).toHaveClass('text-sm', 'font-medium', 'text-gray-500', 'uppercase', 'tracking-wide');
    });

    it('stat card value has correct classes', async () => {
      const { container } = renderAdminDashboard();

      await waitFor(() => {
        const value = container.querySelector('.cq-admin-stat-value');
        expect(value).toHaveClass('mt-2', 'text-3xl', 'font-bold', 'text-gray-900');
      });
    });
  });
});

const mockRecentActiveUsers = [
  {
    id: 'user-1',
    user_name: 'Alice',
    avatar_url: 'https://example.com/alice.jpg',
    last_seen_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  },
  {
    id: 'user-2',
    user_name: 'Bob',
    avatar_url: null,
    last_seen_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
  },
  {
    id: 'user-3',
    user_name: 'Charlie',
    avatar_url: 'https://example.com/charlie.jpg',
    last_seen_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
];

describe('RecentActiveUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations - returning { data, error } structure per agents.md
    mockGetAdminStats.mockResolvedValue({ data: mockStats, error: null });
    mockGetDailyPomodoroCounts.mockResolvedValue({ data: mockDailyPomodoros, error: null });
    mockGetDailyUserSignups.mockResolvedValue({ data: mockDailySignups, error: null });
    mockGetRecentActiveUsers.mockResolvedValue({ data: mockRecentActiveUsers, error: null });
  });

  it('renders loading skeleton while fetching', async () => {
    mockGetRecentActiveUsers.mockReturnValue(new Promise(() => {}));

    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const loadingElement = container.querySelector('.cq-admin-recent-users-loading');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  it('renders section title', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recently Active Users')).toBeInTheDocument();
    });
  });

  it('renders list of recently active users with avatars', async () => {
    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const userItems = container.querySelectorAll('.cq-admin-recent-user-item');
      expect(userItems.length).toBe(3);

      // Check that avatars are rendered
      const avatars = container.querySelectorAll('.cq-admin-recent-user-avatar');
      expect(avatars.length).toBe(3);
    });
  });

  it('renders user names', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('links each user to their profile page', async () => {
    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const links = container.querySelectorAll('.cq-admin-recent-user-link');
      expect(links.length).toBe(3);

      expect(links[0]).toHaveAttribute('href', '/user/user-1');
      expect(links[1]).toHaveAttribute('href', '/user/user-2');
      expect(links[2]).toHaveAttribute('href', '/user/user-3');
    });
  });

  it('shows relative time for last_seen_at', async () => {
    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const times = container.querySelectorAll('.cq-admin-recent-user-time');
      expect(times.length).toBe(3);

      // Check that relative times are displayed (exact text may vary)
      expect(times[0]?.textContent).toMatch(/2 minutes ago|2m ago|just now/i);
      expect(times[1]?.textContent).toMatch(/15 minutes ago|15m ago/i);
      expect(times[2]?.textContent).toMatch(/1 hour ago|1h ago|60 minutes ago/i);
    });
  });

  it('shows empty state when no users', async () => {
    mockGetRecentActiveUsers.mockResolvedValue({ data: [], error: null });

    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const emptyState = container.querySelector('.cq-admin-recent-users-empty');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(/no recent activity|no users/i);
    });
  });

  it('uses placeholder avatar when avatar_url is null', async () => {
    const { container } = renderAdminDashboard();

    await waitFor(() => {
      const avatars = container.querySelectorAll('.cq-admin-recent-user-avatar');
      // Bob (index 1) has null avatar_url
      const bobAvatar = avatars[1] as HTMLImageElement;
      expect(bobAvatar.src).toMatch(/data:image\/svg\+xml/);
    });
  });
});

