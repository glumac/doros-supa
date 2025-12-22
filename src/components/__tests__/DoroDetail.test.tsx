import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DoroDetail from '../DoroDetail';
import { AuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPomodoroDetail } from '../../lib/queries';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../../lib/queries', () => ({
  getPomodoroDetail: vi.fn()
}));

vi.mock('../../lib/storage', () => ({
  getImageSignedUrl: vi.fn().mockResolvedValue('https://example.com/image.jpg')
}));

const mockDoro = {
  id: 'doro-123',
  task: 'Write tests',
  notes: 'Comprehensive test coverage',
  launch_at: '2024-01-15T10:00:00Z',
  completed: true,
  image_url: 'https://example.com/image.jpg',
  user_id: 'user-123',
  created_at: '2024-01-15T09:00:00Z',
  users: {
    id: 'user-123',
    user_name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg'
  },
  likes: [
    {
      id: 'like-1',
      user_id: 'other-user',
      pomodoro_id: 'doro-123',
      created_at: '2024-01-15T10:30:00Z',
      users: {
        id: 'other-user',
        user_name: 'Other User',
        email: 'other@example.com',
        avatar_url: 'https://example.com/other.jpg'
      }
    }
  ],
  comments: [
    {
      id: 'comment-1',
      pomodoro_id: 'doro-123',
      user_id: 'other-user',
      comment_text: 'Great work!',
      created_at: '2024-01-15T11:00:00Z',
      users: {
        id: 'other-user',
        user_name: 'Other User',
        email: 'other@example.com',
        avatar_url: 'https://example.com/other.jpg'
      }
    }
  ]
};

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithAuth = (user = mockUser, doroId = 'doro-123') => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/doro-detail/:doroId"
          element={
            <AuthContext.Provider value={{ user, loading: false }}>
              <DoroDetail user={user} />
            </AuthContext.Provider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

describe('DoroDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPomodoroDetail).mockResolvedValue({
      data: mockDoro,
      error: null
    } as any);
  });

  it('should render pomodoro details', async () => {
    // Navigate to the route
    window.history.pushState({}, '', '/doro-detail/doro-123');
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('Write tests')).toBeInTheDocument();
    });

    expect(screen.getByText('Comprehensive test coverage')).toBeInTheDocument();
  });

  describe('Date formatting', () => {
    it('should show "Today" format for today\'s date', async () => {
      const today = new Date();
      const todayISO = today.toISOString();
      const doroWithToday = {
        ...mockDoro,
        launch_at: todayISO
      };

      vi.mocked(getPomodoroDetail).mockResolvedValue({
        data: doroWithToday,
        error: null
      } as any);

      window.history.pushState({}, '', '/doro-detail/doro-123');
      renderWithAuth();

      await waitFor(() => {
        // Should show "Today" followed by time
        const dateText = screen.getByText(/^Today/);
        expect(dateText).toBeInTheDocument();
      });
    });

    it('should not show year for dates in current year', async () => {
      const currentYear = new Date().getFullYear();
      const dateInCurrentYear = new Date(currentYear, 5, 15, 14, 30); // June 15, current year, 2:30 PM
      const doroWithCurrentYear = {
        ...mockDoro,
        launch_at: dateInCurrentYear.toISOString()
      };

      vi.mocked(getPomodoroDetail).mockResolvedValue({
        data: doroWithCurrentYear,
        error: null
      } as any);

      window.history.pushState({}, '', '/doro-detail/doro-123');
      renderWithAuth();

      await waitFor(() => {
        // Should show format like "Jun 15, 2:30 PM" without year
        const dateText = screen.getByText(/Jun 15,/);
        expect(dateText).toBeInTheDocument();
        // Should not contain the year
        expect(dateText.textContent).not.toContain(currentYear.toString());
      });
    });

    it('should show year for dates from previous year', async () => {
      const previousYear = new Date().getFullYear() - 1;
      const dateFromPreviousYear = new Date(previousYear, 2, 10, 9, 15); // March 10, previous year, 9:15 AM
      const doroWithPreviousYear = {
        ...mockDoro,
        launch_at: dateFromPreviousYear.toISOString()
      };

      vi.mocked(getPomodoroDetail).mockResolvedValue({
        data: doroWithPreviousYear,
        error: null
      } as any);

      window.history.pushState({}, '', '/doro-detail/doro-123');
      renderWithAuth();

      await waitFor(() => {
        // Should show format like "Mar 10, 2023, 9:15 AM" with year
        const dateText = screen.getByText(new RegExp(`Mar 10, ${previousYear}`));
        expect(dateText).toBeInTheDocument();
      });
    });

    it('should show year for dates from future year', async () => {
      const futureYear = new Date().getFullYear() + 1;
      const dateFromFutureYear = new Date(futureYear, 11, 25, 16, 45); // December 25, future year, 4:45 PM
      const doroWithFutureYear = {
        ...mockDoro,
        launch_at: dateFromFutureYear.toISOString()
      };

      vi.mocked(getPomodoroDetail).mockResolvedValue({
        data: doroWithFutureYear,
        error: null
      } as any);

      window.history.pushState({}, '', '/doro-detail/doro-123');
      renderWithAuth();

      await waitFor(() => {
        // Should show format like "Dec 25, 2025, 4:45 PM" with year
        const dateText = screen.getByText(new RegExp(`Dec 25, ${futureYear}`));
        expect(dateText).toBeInTheDocument();
      });
    });

    it('should handle missing launch_at gracefully', async () => {
      const doroWithoutDate = {
        ...mockDoro,
        launch_at: null
      };

      vi.mocked(getPomodoroDetail).mockResolvedValue({
        data: doroWithoutDate,
        error: null
      } as any);

      window.history.pushState({}, '', '/doro-detail/doro-123');
      renderWithAuth();

      await waitFor(() => {
        // Should still render the component without crashing
        expect(screen.getByText('Write tests')).toBeInTheDocument();
      });
    });
  });

  it('should display user information', async () => {
    window.history.pushState({}, '', '/doro-detail/doro-123');
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('should show delete button only for own pomodoro', async () => {
    window.history.pushState({}, '', '/doro-detail/doro-123');
    renderWithAuth();

    await waitFor(() => {
      const deleteButton = screen.getByTitle('Delete Pomodoro');
      expect(deleteButton).toBeInTheDocument();
    });
  });

  it('should allow liking when not already liked', async () => {
    const user = userEvent.setup();
    const doroWithoutLikes = { ...mockDoro, likes: [] };

    vi.mocked(getPomodoroDetail).mockResolvedValue({
      data: doroWithoutLikes,
      error: null
    } as any);

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any);

    window.history.pushState({}, '', '/doro-detail/doro-123');
    renderWithAuth();

    await waitFor(() => {
      const likeButton = screen.getByRole('button', { name: /like/i });
      expect(likeButton).toBeInTheDocument();
    });

    const likeButton = screen.getByRole('button', { name: /like/i });
    await user.click(likeButton);

    expect(mockInsert).toHaveBeenCalledWith({
      pomodoro_id: 'doro-123',
      user_id: 'user-123'
    });
  });

  it('should allow adding a comment', async () => {
    const user = userEvent.setup();

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any);

    window.history.pushState({}, '', '/doro-detail/doro-123');
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText(/add a comment/i);
    await user.type(commentInput, 'Nice job!');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        pomodoro_id: 'doro-123',
        user_id: 'user-123',
        comment_text: 'Nice job!'
      })
    );
  });
});

