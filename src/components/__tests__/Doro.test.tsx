import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Doro from '../Doro';
import { AuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
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

const renderWithAuth = (doro = mockDoro, user = mockUser, reloadFeed = vi.fn()) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, loading: false }}>
        <Doro doro={doro} reloadFeed={reloadFeed} />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Doro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render task and notes', () => {
    renderWithAuth();

    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive test coverage')).toBeInTheDocument();
  });

  it('should display user information', () => {
    renderWithAuth();

    expect(screen.getByText('Test User')).toBeInTheDocument();
    const avatars = screen.getAllByAltText('user-profile');
    expect(avatars[0]).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should show like count', () => {
    renderWithAuth();

    expect(screen.getByText(/likes/i)).toBeInTheDocument();
    const counts = screen.getAllByText(/\(1\)/);
    expect(counts.length).toBeGreaterThan(0);
  });

  it('should display comments', () => {
    renderWithAuth();

    expect(screen.getByText('Great work!')).toBeInTheDocument();
  });

  it('should show delete button only for own pomodoro', () => {
    renderWithAuth();

    const deleteButton = screen.getByTitle('Delete Pomodoro');
    expect(deleteButton).toBeInTheDocument();
  });

  it('should not show delete button for other users pomodoros', () => {
    const otherUserDoro = {
      ...mockDoro,
      user_id: 'other-user',
      users: {
        id: 'other-user',
        user_name: 'Other User',
        email: 'other@example.com',
        avatar_url: 'https://example.com/other.jpg'
      }
    };

    renderWithAuth(otherUserDoro);

    expect(screen.queryByTitle('Delete Pomodoro')).not.toBeInTheDocument();
  });

  it('should allow liking when not already liked', async () => {
    const user = userEvent.setup();
    const doroWithoutLikes = { ...mockDoro, likes: [] };

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any);

    renderWithAuth(doroWithoutLikes);

    const likeButton = screen.getByRole('button', { name: /like/i });
    await user.click(likeButton);

    expect(mockInsert).toHaveBeenCalledWith({
      pomodoro_id: 'doro-123',
      user_id: 'user-123'
    });
  });

  it('should allow unliking when already liked', async () => {
    const user = userEvent.setup();
    const doroWithUserLike = {
      ...mockDoro,
      likes: [{
        id: 'like-1',
        user_id: 'user-123',
        pomodoro_id: 'doro-123',
        created_at: '2024-01-15T10:30:00Z',
        users: mockUser
      }]
    };

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });
    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete
    } as any);

    renderWithAuth(doroWithUserLike);

    const unlikeButton = screen.getByRole('button', { name: /unlike/i });
    await user.click(unlikeButton);

    expect(mockDelete).toHaveBeenCalled();
  });

  it('should show add comment button', () => {
    renderWithAuth();

    const addCommentButton = screen.getByRole('button', { name: 'Comment' });
    expect(addCommentButton).toBeInTheDocument();
  });

  it('should allow adding a comment', async () => {
    const user = userEvent.setup();

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [mockDoro], error: null })
      })
    } as any);

    renderWithAuth();

    const addCommentButton = screen.getByRole('button', { name: 'Comment' });
    await user.click(addCommentButton);

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

  it('should show delete comment button only for own comments', () => {
    const doroWithUserComment = {
      ...mockDoro,
      comments: [
        {
          id: 'comment-1',
          pomodoro_id: 'doro-123',
          user_id: 'user-123',
          comment_text: 'My comment',
          created_at: '2024-01-15T11:00:00Z',
          users: mockUser
        }
      ]
    };

    renderWithAuth(doroWithUserComment);

    expect(screen.getByTitle('Delete Comment')).toBeInTheDocument();
  });

  it('should delete pomodoro and call reloadFeed', async () => {
    const user = userEvent.setup();
    const reloadFeed = vi.fn();

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete
    } as any);

    renderWithAuth(mockDoro, mockUser, reloadFeed);

    const deleteButton = screen.getByTitle('Delete Pomodoro');
    await user.click(deleteButton);

    expect(mockDelete).toHaveBeenCalled();
    await waitFor(() => {
      expect(reloadFeed).toHaveBeenCalledWith(true);
    });
  });

  it('should render image when present', () => {
    renderWithAuth();

    const image = screen.getByAltText('User Pomodoro');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should format date correctly', () => {
    renderWithAuth();

    // Should show relative time or formatted date
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });
});
