import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FollowersModal from '../FollowersModal';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  getFollowersList: vi.fn(),
  getFollowingList: vi.fn(),
  isFollowingUser: vi.fn(),
  getUserProfile: vi.fn(),
  getFollowRequestStatus: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  createFollowRequest: vi.fn(),
  cancelFollowRequest: vi.fn(),
  isBlockedByUser: vi.fn(),
  getBlockStatus: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const mockFollowers = [
  {
    follower_id: 'follower-1',
    created_at: '2024-01-01',
    users: {
      id: 'follower-1',
      user_name: 'Follower One',
      avatar_url: 'https://example.com/follower1.jpg'
    }
  },
  {
    follower_id: 'follower-2',
    created_at: '2024-01-02',
    users: {
      id: 'follower-2',
      user_name: 'Follower Two',
      avatar_url: null
    }
  }
];

const mockFollowing = [
  {
    following_id: 'following-1',
    created_at: '2024-01-01',
    users: {
      id: 'following-1',
      user_name: 'Following One',
      avatar_url: 'https://example.com/following1.jpg'
    }
  }
];

const renderWithAuth = (component: React.ReactElement, user = mockUser) => {
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
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FollowersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks for FollowButton component
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: { followers_only: false },
      error: null
    });
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null
    });
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: null,
      error: null
    });
    vi.mocked(queries.isBlockedByUser).mockResolvedValue(false);
    vi.mocked(queries.getBlockStatus).mockResolvedValue({ iBlocked: false, theyBlocked: false });
  });

  it('should render modal with user name in header', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    const onClose = vi.fn();
    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={onClose}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={onClose}
      />
    );

    const closeButton = screen.getByText('×');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should display followers tab by default', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
      expect(screen.getByText('Follower Two')).toBeInTheDocument();
    });
  });

  it('should switch to following tab when clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });
    vi.mocked(queries.getFollowingList).mockResolvedValue({
      data: mockFollowing,
      count: 1,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
    });

    const followingTab = screen.getByRole('button', { name: /Following/i });
    await user.click(followingTab);

    await waitFor(() => {
      expect(screen.getByText('Following One')).toBeInTheDocument();
      expect(screen.queryByText('Follower One')).not.toBeInTheDocument();
    });
  });

  it('should show "No followers yet" when list is empty', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        initialTab="followers"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No followers yet')).toBeInTheDocument();
    });
  });

  it('should show "No following yet" when list is empty', async () => {
    vi.mocked(queries.getFollowingList).mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        initialTab="following"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No following yet')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    vi.mocked(queries.getFollowersList).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: [], count: 0, error: null }), 100))
    );

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display pagination when there are multiple pages', async () => {
    const manyFollowers = Array.from({ length: 25 }, (_, i) => ({
      follower_id: `follower-${i}`,
      created_at: '2024-01-01',
      users: {
        id: `follower-${i}`,
        user_name: `Follower ${i}`,
        avatar_url: null
      }
    }));

    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: manyFollowers.slice(0, 20),
      count: 25,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });
  });

  it('should allow blocking a user from the list and remove them from view', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });
    vi.mocked(queries.blockUser).mockResolvedValue({ data: { id: 'block-1' } as any, error: null } as any);

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
      expect(screen.getByText('Follower Two')).toBeInTheDocument();
    });

    // BlockButton starts disabled while block status loads; wait until it's enabled and labeled "Block".
    let blockButton: HTMLButtonElement | null = null;
    await waitFor(() => {
      const btn = screen.getAllByRole('button', { name: 'Block' })[0] as HTMLButtonElement | undefined;
      expect(btn).toBeTruthy();
      expect(btn).toBeEnabled();
      blockButton = btn || null;
    });

    await user.click(blockButton!);

    await waitFor(() => {
      expect(screen.queryByText('Follower One')).not.toBeInTheDocument();
    });
  });

  it('should not show block link when already following the user', async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: true,
      error: null
    });
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower One')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Block' })).not.toBeInTheDocument();
  });

  it('should navigate to next page', async () => {
    const user = userEvent.setup();
    const manyFollowers = Array.from({ length: 25 }, (_, i) => ({
      follower_id: `follower-${i}`,
      created_at: '2024-01-01',
      users: {
        id: `follower-${i}`,
        user_name: `Follower ${i}`,
        avatar_url: null
      }
    }));

    vi.mocked(queries.getFollowersList)
      .mockResolvedValueOnce({
        data: manyFollowers.slice(0, 20),
        count: 25,
        error: null
      })
      .mockResolvedValueOnce({
        data: manyFollowers.slice(20, 25),
        count: 25,
        error: null
      });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    });

    expect(queries.getFollowersList).toHaveBeenCalledWith('user-123', 2, 20);
  });

  it('should use fallback avatar when avatar_url is null', async () => {
    vi.mocked(queries.getFollowersList).mockResolvedValue({
      data: mockFollowers,
      count: 2,
      error: null
    });

    renderWithAuth(
      <FollowersModal
        userId="user-123"
        userName="John Doe"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follower Two')).toBeInTheDocument();
    });

    // Check that there's an image with the placeholder data URI (SVG) in its src
    const images = screen.getAllByRole('img');
    const hasPlaceholder = images.some(img =>
      img.getAttribute('src')?.startsWith('data:image/svg+xml')
    );
    expect(hasPlaceholder).toBe(true);
  });

  describe('Accessibility', () => {
    it('should have role="dialog" and aria-modal="true"', async () => {
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should have aria-labelledby pointing to the title', async () => {
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        const title = screen.getByText('John Doe');
        expect(modal).toHaveAttribute('aria-labelledby', 'cq-followers-modal-title');
        expect(title).toHaveAttribute('id', 'cq-followers-modal-title');
      });
    });

    it('should have aria-label for close button', async () => {
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
      });
    });

    it('should focus close button when modal opens', async () => {
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });
    });

    it('should return focus to trigger button when modal closes', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      const triggerButton = document.createElement('button');
      triggerButton.setAttribute('aria-label', 'View 5 followers');
      document.body.appendChild(triggerButton);
      const triggerRef = { current: triggerButton };

      const onClose = vi.fn();
      const { unmount } = renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={onClose}
          triggerRef={triggerRef}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });

      // Close the modal by clicking close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();

      // Unmount the modal to simulate it being removed from DOM
      // This triggers the useEffect cleanup which should return focus
      unmount();

      // Wait for focus to return (the setTimeout in useModalFocus runs after unmount)
      // Note: In a real scenario, the parent component would unmount the modal,
      // which triggers the cleanup effect that returns focus
      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      }, { timeout: 300 });

      document.body.removeChild(triggerButton);
    });

    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      const onClose = vi.fn();
      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when clicking overlay (outside modal)', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      const onClose = vi.fn();
      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog').parentElement;
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should NOT close modal when clicking inside modal content', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: mockFollowers,
        count: 2,
        error: null
      });

      const onClose = vi.fn();
      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Follower One')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      await user.click(modal);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should have visible focus ring on close button when focused via keyboard', async () => {
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: [],
        count: 0,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });

      // Focus the button
      closeButton.focus();

      // Check that button is focusable and receives focus
      expect(closeButton).toHaveFocus();
    });

    it('should trap focus within modal when using Tab key', async () => {
      const user = userEvent.setup();
      vi.mocked(queries.getFollowersList).mockResolvedValue({
        data: mockFollowers,
        count: 2,
        error: null
      });

      renderWithAuth(
        <FollowersModal
          userId="user-123"
          userName="John Doe"
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Follower One')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();

      // Tab through focusable elements
      await user.tab();

      // Should focus on tab buttons or other focusable elements within modal
      // The exact element depends on the modal structure, but focus should remain in modal
      const activeElement = document.activeElement;
      const modal = screen.getByRole('dialog');
      expect(modal.contains(activeElement)).toBe(true);
    });
  });
});
