import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FollowRequestsBanner from '../FollowRequestsBanner';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  getPendingFollowRequestsCount: vi.fn(),
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithRouter = (component: React.ReactElement, user = mockUser, initialPath = '/') => {
  window.history.pushState({}, '', initialPath);

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user, loading: false }}>
        <Routes>
          <Route path="*" element={component} />
        </Routes>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('FollowRequestsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when user is not logged in', () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 5,
      error: null
    });

    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: null, loading: false }}>
          <FollowRequestsBanner />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.queryByText(/pending follow request/i)).not.toBeInTheDocument();
  });

  it('should not render when there are no pending requests', async () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 0,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(queries.getPendingFollowRequestsCount).toHaveBeenCalled();
    });

    expect(screen.queryByText(/pending follow request/i)).not.toBeInTheDocument();
  });

  it('should not render on create-doro page', async () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 3,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />, mockUser, '/create-doro');

    await waitFor(() => {
      expect(queries.getPendingFollowRequestsCount).toHaveBeenCalled();
    });

    expect(screen.queryByText(/pending follow request/i)).not.toBeInTheDocument();
  });

  it('should display banner with singular text for 1 request', async () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 1,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 1 pending follow request/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/requests/i)).not.toBeInTheDocument();
  });

  it('should display banner with plural text for multiple requests', async () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 5,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 5 pending follow requests/i)).toBeInTheDocument();
    });
  });

  it('should navigate to user profile with requests tab when clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 3,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 3 pending follow requests/i)).toBeInTheDocument();
    });

    const banner = screen.getByText(/You have 3 pending follow requests/i).closest('div');
    await user.click(banner!);

    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe('/user/user-123?tab=requests');
    });
  });

  it('should display bell emoji', async () => {
    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 2,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText('🔔')).toBeInTheDocument();
    });
  });

  it.skip('should poll for updates every 30 seconds', async () => {
    vi.useFakeTimers();

    vi.mocked(queries.getPendingFollowRequestsCount).mockResolvedValue({
      count: 2,
      error: null
    });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(queries.getPendingFollowRequestsCount).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(queries.getPendingFollowRequestsCount).toHaveBeenCalledTimes(2);
    });

    // Fast-forward another 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(queries.getPendingFollowRequestsCount).toHaveBeenCalledTimes(3);
    });

    vi.useRealTimers();
  });

  it.skip('should update count when new requests arrive', async () => {
    vi.useFakeTimers();

    vi.mocked(queries.getPendingFollowRequestsCount)
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 3, error: null });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 1 pending follow request/i)).toBeInTheDocument();
    });

    // Fast-forward 30 seconds to trigger poll
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(screen.getByText(/You have 3 pending follow requests/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it.skip('should hide banner when count becomes 0', async () => {
    vi.useFakeTimers();

    vi.mocked(queries.getPendingFollowRequestsCount)
      .mockResolvedValueOnce({ count: 2, error: null })
      .mockResolvedValueOnce({ count: 0, error: null });

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 2 pending follow requests/i)).toBeInTheDocument();
    });

    // Fast-forward 30 seconds to trigger poll
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(screen.queryByText(/pending follow request/i)).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('should handle errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(queries.getPendingFollowRequestsCount).mockRejectedValue(
      new Error('Network error')
    );

    renderWithRouter(<FollowRequestsBanner />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading follow request count:',
        expect.any(Error)
      );
    });

    expect(screen.queryByText(/pending follow request/i)).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
