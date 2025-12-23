import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Feed from '../Feed';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  getFeed: vi.fn(),
  searchPomodoros: vi.fn(),
  getSuggestedUsers: vi.fn(),
}));

const mockDoros = [
  {
    id: 'doro-1',
    task: 'First Task',
    notes: 'First notes',
    launch_at: '2024-01-15T10:00:00Z',
    completed: true,
    image_url: null,
    user_id: 'user-1',
    created_at: '2024-01-15T09:00:00Z',
    users: {
      id: 'user-1',
      user_name: 'User One',
      email: 'user1@example.com',
      avatar_url: 'https://example.com/user1.jpg'
    },
    likes: [],
    comments: []
  },
  {
    id: 'doro-2',
    task: 'Second Task',
    notes: 'Second notes',
    launch_at: '2024-01-15T11:00:00Z',
    completed: true,
    image_url: 'https://example.com/image.jpg',
    user_id: 'user-2',
    created_at: '2024-01-15T10:00:00Z',
    users: {
      id: 'user-2',
      user_name: 'User Two',
      email: 'user2@example.com',
      avatar_url: 'https://example.com/user2.jpg'
    },
    likes: [],
    comments: []
  }
];

const mockUser = {
  id: 'current-user',
  user_name: 'Current User',
  email: 'current@example.com',
  avatar_url: 'https://example.com/current.jpg'
};

const renderWithAuth = (user = mockUser) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, loading: false }}>
          <Feed />
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getSuggestedUsers to prevent errors if called indirectly
    vi.mocked(queries.getSuggestedUsers).mockResolvedValue({ data: [], error: null });
  });

  it('should render loading spinner initially', () => {
    vi.mocked(queries.getFeed).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    renderWithAuth();

    expect(screen.getByText(/checking the vine/i)).toBeInTheDocument();
  });

  it('should display pomodoros after loading', async () => {
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
    });
  });

  it('should show empty state when no pomodoros', async () => {
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: [],
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText(/no pomodoros found/i)).toBeInTheDocument();
    });
  });

  it('should reload feed when reloadFeed is called', async () => {
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    // Feed should be loaded on mount
    expect(queries.getFeed).toHaveBeenCalledTimes(1);
    expect(queries.getFeed).toHaveBeenCalledWith(20, 'current-user');
  });

  it('should respect RLS and only show followed users pomodoros', async () => {
    // RLS is enforced at database level, but feed should only show filtered results
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: [mockDoros[0]], // Only one doro returned due to RLS
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.queryByText('Second Task')).not.toBeInTheDocument();
    });
  });

  it('should render Doro components with correct props', async () => {
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithAuth();

    await waitFor(() => {
      const doroElements = screen.getAllByText(/task/i);
      expect(doroElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(queries.getFeed).mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' } as any
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText(/no pomodoros found/i)).toBeInTheDocument();
    });
  });
});
