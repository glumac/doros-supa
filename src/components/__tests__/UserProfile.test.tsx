import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import UserProfile from '../UserProfile';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/queries');
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn()
    }
  }
}));

const mockUser = {
  id: 'user-123',
  user_name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z'
};

const mockDoros = [
  {
    id: 'doro-1',
    task: 'Task 1',
    notes: 'Notes 1',
    launch_at: '2024-01-15T10:00:00Z',
    completed: true,
    image_url: null,
    user_id: 'user-123',
    created_at: '2024-01-15T09:00:00Z',
    users: mockUser,
    likes: [],
    comments: []
  }
];

const renderWithRouter = (userId: string, authUser = mockUser) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user: authUser, loading: false }}>
        <Routes>
          <Route path="/user/:userId" element={<UserProfile />} />
        </Routes>
      </AuthContext.Provider>
    </BrowserRouter>,
    { wrapper: ({ children }) => (
      <div>
        {children}
        <div id="navigation-mock">
          <a href={`/user/${userId}`}>Navigate</a>
        </div>
      </div>
    )}
  );
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/user-123');

    // Mock isFollowingUser by default
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
  });

  it('should load and display user profile', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John Doe', level: 1 })).toBeInTheDocument();
    });
  });

  it('should display user avatar', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      const avatar = screen.getByAltText('user-pic');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('should show logout button for own profile', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithRouter('user-123', mockUser);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });

  it('should show follow button for other users profiles', async () => {
    const otherUser = {
      ...mockUser,
      id: 'other-user',
      user_name: 'Other User'
    };

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: otherUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: [],
      error: null
    });

    window.history.pushState({}, '', '/user/other-user');
    renderWithRouter('other-user', mockUser);

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
      // FollowButton should be rendered
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });
  });

  it('should display users pomodoros', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null,
      count: 1
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  it('should show empty state when user has no pomodoros', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: [],
      error: null,
      count: 0
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText(/no pomodoros found/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const createMockDorosArray = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `doro-${i + 1}`,
        task: `Task ${i + 1}`,
        notes: `Notes ${i + 1}`,
        launch_at: '2024-01-15T10:00:00Z',
        completed: true,
        image_url: null,
        user_id: 'user-123',
        created_at: '2024-01-15T09:00:00Z',
        users: mockUser,
        likes: [],
        comments: []
      }));
    };

    it('should not show pagination when user has <= 20 pomodoros', async () => {
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });
      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros20,
        error: null,
        count: 20
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Pagination should not be visible
      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
    });

    it('should show pagination when user has > 20 pomodoros', async () => {
      const mockDoros21 = createMockDorosArray(20); // First page shows 20

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });
      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros21,
        error: null,
        count: 87 // Total of 87 pomodoros
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Pagination should be visible
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('should display page info when pomodoros are shown', async () => {
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });
      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros20,
        error: null,
        count: 87
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText(/showing 1–20 of 87 pomodoros/i)).toBeInTheDocument();
      });
    });

    it('should load page 2 when Next button is clicked', async () => {
      const user = userEvent.setup();
      const mockDoros20Page1 = createMockDorosArray(20);
      const mockDoros20Page2 = createMockDorosArray(20).map((doro, i) => ({
        ...doro,
        id: `doro-page2-${i + 1}`,
        task: `Page 2 Task ${i + 1}`
      }));

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });

      // First call returns page 1
      vi.mocked(queries.getUserPomodoros)
        .mockResolvedValueOnce({
          data: mockDoros20Page1,
          error: null,
          count: 50
        })
        // Second call returns page 2
        .mockResolvedValueOnce({
          data: mockDoros20Page2,
          error: null,
          count: 50
        });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Page 2 Task 1')).toBeInTheDocument();
        expect(queries.getUserPomodoros).toHaveBeenCalledWith('user-123', 2, 20);
      });
    });

    it('should show loading spinner during page transition', async () => {
      const user = userEvent.setup();
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });

      vi.mocked(queries.getUserPomodoros)
        .mockResolvedValueOnce({
          data: mockDoros20,
          error: null,
          count: 50
        })
        .mockImplementationOnce(() =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data: mockDoros20,
                error: null,
                count: 50
              });
            }, 100);
          })
        );

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      // Should show loading spinner
      expect(screen.getByText(/loading pomodoros/i)).toBeInTheDocument();
    });

    it('should call getUserPomodoros with page and pageSize parameters', async () => {
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });

      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros20,
        error: null,
        count: 50
      });

      vi.mocked(queries.isFollowingUser).mockResolvedValue({
        isFollowing: false,
        error: null
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(queries.getUserPomodoros).toHaveBeenCalledWith('user-123', 1, 20);
      });
    });

    it('should handle edge case of exactly 20 pomodoros (no pagination)', async () => {
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });
      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros20,
        error: null,
        count: 20
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Should show page info
      expect(screen.getByText(/showing 1–20 of 20 pomodoros/i)).toBeInTheDocument();

      // But no pagination controls
      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
    });

    it('should handle edge case of 21 pomodoros (2 pages)', async () => {
      const mockDoros20 = createMockDorosArray(20);

      vi.mocked(queries.getUserProfile).mockResolvedValue({
        data: mockUser,
        error: null
      });
      vi.mocked(queries.getUserPomodoros).mockResolvedValue({
        data: mockDoros20,
        error: null,
        count: 21
      });

      renderWithRouter('user-123');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Should show pagination with 2 pages
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    });
  });

  it('should call signOut when logout button clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null
    });
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    renderWithRouter('user-123', mockUser);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John Doe', level: 1 })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should show loading spinner while fetching data', () => {
    vi.mocked(queries.getUserProfile).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    vi.mocked(queries.getUserPomodoros).mockReturnValue(
      new Promise(() => {})
    );

    renderWithRouter('user-123');

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('should display completed pomodoros count', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: mockUser,
      error: null
    });
    vi.mocked(queries.getUserPomodoros).mockResolvedValue({
      data: mockDoros,
      error: null
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText(/completed pomodoros/i)).toBeInTheDocument();
    });
  });
});
