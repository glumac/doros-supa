import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UserSearch from './UserSearch';
import { useAuth } from '../contexts/AuthContext';
import * as queries from '../lib/queries';

// Mock dependencies
vi.mock('../contexts/AuthContext');
vi.mock('../lib/queries');

// Mock FollowButton - store props for testing
let mockFollowButtonProps: Record<string, any> = {};
vi.mock('./FollowButton', () => ({
  default: ({ userId, initialIsFollowing, onFollowChange }: any) => {
    // Store props for testing
    mockFollowButtonProps[userId] = { initialIsFollowing, onFollowChange };
    return (
      <button
        data-testid={`follow-button-${userId}`}
        onClick={() => onFollowChange?.(true)}
      >
        {initialIsFollowing ? 'Following' : 'Follow'}
      </button>
    );
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderUserSearch = () => {
  return render(
    <BrowserRouter>
      <UserSearch />
    </BrowserRouter>
  );
};

describe('UserSearch', () => {
  const mockUser = { id: 'current-user-123', email: 'test@example.com' };

  const mockSearchResults = [
    {
      user_id: 'user-1',
      user_name: 'John Doe',
      avatar_url: 'https://example.com/avatar1.jpg',
      is_following: false,
      follower_count: 10,
      completion_count: 25,
    },
    {
      user_id: 'user-2',
      user_name: 'Jane Smith',
      avatar_url: 'https://example.com/avatar2.jpg',
      is_following: true,
      follower_count: 15,
      completion_count: 30,
    },
    {
      user_id: 'user-3',
      user_name: 'Bob Johnson',
      avatar_url: null,
      is_following: false,
      follower_count: 5,
      completion_count: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowButtonProps = {};
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
    });
  });

  it('should show login message when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    renderUserSearch();

    expect(screen.getByText('Please log in to search for users')).toBeInTheDocument();
  });

  it('should render search input when user is logged in', () => {
    renderUserSearch();

    expect(screen.getByPlaceholderText('Search users by name...')).toBeInTheDocument();
  });

  it('should display header', () => {
    renderUserSearch();

    expect(screen.getByText('🔍 Find Friends')).toBeInTheDocument();
  });

  it('should debounce search input', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    // Should not search immediately
    expect(queries.searchUsers).not.toHaveBeenCalled();

    // Wait for debounced search (300ms + a bit extra)
    await waitFor(() => {
      expect(queries.searchUsers).toHaveBeenCalledWith('John', mockUser.id);
    }, { timeout: 1000 });
  });

  it('should display search results', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should show loading state while searching', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockReturnValue(
      new Promise(() => {}) as any
    );

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show "No users found" when search returns empty results', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No users found matching/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should clear results when search input is cleared', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 1000 });

    await user.clear(input);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should display follower and completion counts', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [mockSearchResults[0]],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByText(/10 followers/)).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText(/25 pomodoros/)).toBeInTheDocument();
  });

  it('should render FollowButton for each user', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByTestId('follow-button-user-1')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByTestId('follow-button-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('follow-button-user-3')).toBeInTheDocument();
  });

  it('should navigate to user profile when clicking on result', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [mockSearchResults[0]],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click on user name or avatar area (not the follow button)
    const userName = screen.getByText('John Doe');
    await user.click(userName);

    expect(mockNavigate).toHaveBeenCalledWith('/user/user-1');
  });

  it('should handle search error', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: null,
      error: { message: 'Search failed' } as any,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching users:', {
        message: 'Search failed',
      });
    }, { timeout: 1000 });

    consoleErrorSpy.mockRestore();
  });

  it('should not search with only whitespace', async () => {
    const user = userEvent.setup();
    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, '   ');

    // Wait a bit to ensure debounce would have triggered
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(queries.searchUsers).not.toHaveBeenCalled();
  });

  it('should handle null avatar_url gracefully', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [mockSearchResults[2]], // Bob Johnson with null avatar
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'Bob');

    await waitFor(() => {
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Should render without errors
    const avatar = screen.getByAltText('Bob Johnson');
    expect(avatar).toBeInTheDocument();
  });

  it('should cancel previous search when typing new query', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');

    // Type full query at once - debounce will only trigger once
    await user.type(input, 'John');

    // Should only search once with final query
    await waitFor(() => {
      expect(queries.searchUsers).toHaveBeenCalledTimes(1);
      expect(queries.searchUsers).toHaveBeenCalledWith('John', mockUser.id);
    }, { timeout: 1000 });
  });

  it('should update results when follow state changes', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [mockSearchResults[0]],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByTestId('follow-button-user-1')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click follow button (which triggers onFollowChange in our mock)
    const followButton = screen.getByTestId('follow-button-user-1');
    await user.click(followButton);

    // The component should handle the follow state change
    expect(followButton).toBeInTheDocument();
  });

  it('should pass initialIsFollowing prop to FollowButton for search results', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [
        {
          ...mockSearchResults[0],
          is_following: false,
        },
        {
          ...mockSearchResults[1],
          is_following: true, // Jane Smith is being followed
        },
      ],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByTestId('follow-button-user-1')).toBeInTheDocument();
      expect(screen.getByTestId('follow-button-user-2')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify FollowButton received correct initialIsFollowing values
    expect(mockFollowButtonProps['user-1']).toBeDefined();
    expect(mockFollowButtonProps['user-1'].initialIsFollowing).toBe(false);

    expect(mockFollowButtonProps['user-2']).toBeDefined();
    expect(mockFollowButtonProps['user-2'].initialIsFollowing).toBe(true);
  });

  it('should show "Following" button for users already being followed in search results', async () => {
    const user = userEvent.setup();
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [
        {
          ...mockSearchResults[1], // Jane Smith with is_following: true
        },
      ],
      error: null,
    });

    renderUserSearch();

    const input = screen.getByPlaceholderText('Search users by name...');
    await user.type(input, 'Jane');

    await waitFor(() => {
      const followButton = screen.getByTestId('follow-button-user-2');
      expect(followButton).toBeInTheDocument();
      expect(followButton).toHaveTextContent('Following');
    }, { timeout: 1000 });
  });
});
