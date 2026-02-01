import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Doro from '../Doro';
import { AuthContext } from '../../contexts/AuthContext';

// Mock hooks
vi.mock('../../hooks/useMutations', () => ({
  useLikeMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUnlikeMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCommentMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteCommentMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeletePomodoroMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe('Doro - Scroll and Highlight', () => {
  let queryClient: QueryClient;
  let originalHash: string;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    id: 'user-123',
    user_metadata: { user_name: 'AuthUser' },
  };

  const mockDoro = {
    id: 'pomodoro-456',
    user_id: 'user-123',
    task: 'Test Task',
    notes: 'Test Notes',
    completed: true,
    created_at: '2024-01-15T10:00:00Z',
    launch_at: '2024-01-15T10:00:00Z',
    image_url: null,
    users: {
      id: 'user-123',
      user_name: 'TestUser',
      avatar_url: null,
    },
    likes: [],
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Save original hash
    originalHash = window.location.hash;

    // Mock scrollIntoView
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    // Mock getElementById
    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === `pomodoro-${mockDoro.id}`) {
        return {
          scrollIntoView: scrollIntoViewMock,
        } as any;
      }
      return null;
    });
  });

  afterEach(() => {
    // Restore hash
    window.location.hash = originalHash;
    vi.restoreAllMocks();
  });

  const renderDoro = (doro = mockDoro) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user: mockAuthUser as any,
            session: null,
            userProfile: mockAuthUser as any,
            loading: false,
            refreshUserProfile: vi.fn(),
          }}
        >
          <BrowserRouter>
            <Doro doro={doro as any} />
          </BrowserRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  it('should render with unique ID attribute', () => {
    const { container } = renderDoro();

    const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
    expect(doroElement).toBeInTheDocument();
    expect(doroElement).toHaveClass('cq-doro-card');
  });

  it('should scroll to element when hash matches pomodoro ID', async () => {
    // Set hash before rendering
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    renderDoro();

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
    }, { timeout: 500 });
  });

  it('should apply highlight class when scrolled to', async () => {
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    const { container } = renderDoro();

    await waitFor(() => {
      const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
      expect(doroElement).toHaveClass('cq-highlighted');
      expect(doroElement).toHaveClass('bg-yellow-100');
    }, { timeout: 500 });
  });

  it('should remove highlight after 3 seconds', async () => {
    vi.useFakeTimers();
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    const { container } = renderDoro();

    // Wait for highlight to apply
    await waitFor(() => {
      const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
      expect(doroElement).toHaveClass('cq-highlighted');
    });

    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
      expect(doroElement).not.toHaveClass('cq-highlighted');
      expect(doroElement).not.toHaveClass('bg-yellow-100');
    });

    vi.useRealTimers();
  });

  it('should not scroll or highlight when hash does not match', async () => {
    window.location.hash = '#pomodoro-different-id';

    const { container } = renderDoro();

    // Wait a bit to ensure no scrolling happens
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
    expect(doroElement).not.toHaveClass('cq-highlighted');
  });

  it('should not scroll or highlight when no hash present', async () => {
    window.location.hash = '';

    const { container } = renderDoro();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
    expect(doroElement).not.toHaveClass('cq-highlighted');
  });

  it('should have transition-colors class for smooth animation', () => {
    const { container } = renderDoro();

    const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
    expect(doroElement).toHaveClass('transition-colors');
    expect(doroElement).toHaveClass('duration-1000');
  });

  it('should use cq-highlighted class for testing selector', async () => {
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    const { container } = renderDoro();

    await waitFor(() => {
      const highlightedElement = container.querySelector('.cq-highlighted');
      expect(highlightedElement).toBeInTheDocument();
      expect(highlightedElement?.id).toBe(`pomodoro-${mockDoro.id}`);
    }, { timeout: 500 });
  });

  it('should handle multiple doros with different IDs correctly', () => {
    const doro1 = { ...mockDoro, id: 'pomodoro-1' };
    const doro2 = { ...mockDoro, id: 'pomodoro-2' };

    const { container: container1 } = renderDoro(doro1);
    const { container: container2 } = renderDoro(doro2);

    expect(container1.querySelector('#pomodoro-pomodoro-1')).toBeInTheDocument();
    expect(container2.querySelector('#pomodoro-pomodoro-2')).toBeInTheDocument();
  });

  it('should maintain highlight styling during transition', async () => {
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    const { container } = renderDoro();

    await waitFor(() => {
      const doroElement = container.querySelector(`#pomodoro-${mockDoro.id}`);
      expect(doroElement).toHaveClass('bg-yellow-100');

      // Check that background color is applied
      const computedStyle = window.getComputedStyle(doroElement as Element);
      // Tailwind bg-yellow-100 should result in a yellow-ish background
      expect(computedStyle).toBeDefined();
    }, { timeout: 500 });
  });

  it('should respond to hashchange events', async () => {
    // Start with no hash
    window.location.hash = '';

    renderDoro();

    // Change the hash to match this pomodoro
    window.location.hash = `#pomodoro-${mockDoro.id}`;

    // Trigger hashchange event
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    // Should now scroll
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    }, { timeout: 500 });

    // Verify scrollIntoView was called with correct options
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });
});
