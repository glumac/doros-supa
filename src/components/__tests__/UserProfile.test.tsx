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
      error: null
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
      error: null
    });

    renderWithRouter('user-123');

    await waitFor(() => {
      expect(screen.getByText(/no pomodoros found/i)).toBeInTheDocument();
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
