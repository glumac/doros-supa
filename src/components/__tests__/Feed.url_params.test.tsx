import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Feed from '../Feed';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';
import type { User } from '@supabase/supabase-js';
import * as useFeedModule from '../../hooks/useFeed';

vi.mock('../../lib/queries', () => ({
  getFeed: vi.fn(),
  searchPomodoros: vi.fn(),
}));

vi.mock('../../hooks/useFeed', () => ({
  useFeed: vi.fn(),
  useSearchPomodoros: vi.fn(),
}));

const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  email: 'test@example.com',
} as User;

const renderWithAuth = (component: React.ReactElement, user: User | null = mockUser, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={{ user, loading: false }}>
        {component}
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Feed - URL Parameter Switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should read ?feed=global URL param and pass to useFeed hook', async () => {
    const mockUseFeed = vi.mocked(useFeedModule.useFeed);

    mockUseFeed.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<Feed />, mockUser, ['/?feed=global']);

    await waitFor(() => {
      // Should call useFeed with 'global' feedType
      expect(mockUseFeed).toHaveBeenCalledWith(20, 'user-123', 'global');
    });
  });

  it('should read ?feed=following URL param and pass to useFeed hook', async () => {
    const mockUseFeed = vi.mocked(useFeedModule.useFeed);

    mockUseFeed.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<Feed />, mockUser, ['/?feed=following']);

    await waitFor(() => {
      // Should call useFeed with 'following' feedType
      expect(mockUseFeed).toHaveBeenCalledWith(20, 'user-123', 'following');
    });
  });

  it('should default to global feed if no URL param is present', async () => {
    const mockUseFeed = vi.mocked(useFeedModule.useFeed);

    mockUseFeed.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithAuth(<Feed />, mockUser, ['/']);

    await waitFor(() => {
      // Should default to 'global' when no param
      expect(mockUseFeed).toHaveBeenCalledWith(20, 'user-123', 'global');
    });
  });

  // Note: Testing URL param changes is better suited for integration tests
  // Unit tests verify that the component reads the URL param correctly
});

