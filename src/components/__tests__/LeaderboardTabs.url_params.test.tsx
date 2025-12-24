import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeaderboardTabs from '../LeaderboardTabs';
import { AuthContext } from '../../contexts/AuthContext';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithAuth = (component: React.ReactElement, user = mockUser, initialEntries = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={{ user, loading: false }}>
          {component}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('LeaderboardTabs - URL Parameter Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should set ?feed=global URL param when "Global" tab is clicked', async () => {
    const user = userEvent.setup();

    renderWithAuth(<LeaderboardTabs />, mockUser, ['/?feed=following']);

    await waitFor(() => {
      const globalTab = screen.getByText(/Global|🌍/i);
      expect(globalTab).toBeInTheDocument();
    });

    const globalTab = screen.getByText(/Global|🌍/i).closest('button');
    if (globalTab) {
      await user.click(globalTab);
    }

    await waitFor(() => {
      // Should navigate to ?feed=global
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('feed=global'),
        { replace: true }
      );
    });
  });

  it('should set ?feed=following URL param when "Friends" tab is clicked', async () => {
    const user = userEvent.setup();

    renderWithAuth(<LeaderboardTabs />, mockUser, ['/?feed=global']);

    await waitFor(() => {
      const friendsTab = screen.getByText(/Friends|👥/i);
      expect(friendsTab).toBeInTheDocument();
    });

    const friendsTab = screen.getByText(/Friends|👥/i).closest('button');
    if (friendsTab) {
      await user.click(friendsTab);
    }

    await waitFor(() => {
      // Should navigate to ?feed=following
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('feed=following'),
        { replace: true }
      );
    });
  });

  it('should sync tab state with URL param', async () => {
    // Start with global in URL
    renderWithAuth(<LeaderboardTabs />, mockUser, ['/?feed=global']);

    await waitFor(() => {
      // Global tab should be active
      const globalTab = screen.getByText(/Global|🌍/i).closest('button');
      expect(globalTab).toHaveClass(/active|selected/i);
    });
  });

  it('should default to global tab if no URL param is present', async () => {
    renderWithAuth(<LeaderboardTabs />, mockUser, ['/']);

    await waitFor(() => {
      // Should default to global
      const globalTab = screen.getByText(/Global|🌍/i).closest('button');
      expect(globalTab).toHaveClass(/active|selected/i);
    });
  });
});

