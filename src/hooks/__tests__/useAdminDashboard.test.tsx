import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useRecentActiveUsers } from '../useAdminDashboard';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';

vi.mock('../../lib/queries', () => ({
  getRecentActiveUsers: vi.fn(),
}));

const mockAdminProfile = {
  id: 'admin-123',
  user_name: 'Admin User',
  email: 'admin@example.com',
  avatar_url: null,
  is_admin: true,
};

const mockNonAdminProfile = {
  id: 'user-123',
  user_name: 'Regular User',
  email: 'user@example.com',
  avatar_url: null,
  is_admin: false,
};

const mockRecentUsers = [
  {
    id: 'user-1',
    user_name: 'Alice',
    avatar_url: 'https://example.com/alice.jpg',
    last_seen_at: new Date().toISOString(),
  },
  {
    id: 'user-2',
    user_name: 'Bob',
    avatar_url: null,
    last_seen_at: new Date().toISOString(),
  },
];

describe('useRecentActiveUsers', () => {
  let queryClient: QueryClient;

  const createWrapper = (userProfile: typeof mockAdminProfile | null = mockAdminProfile) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{
          user: userProfile ? { id: userProfile.id } : null,
          userProfile: userProfile,
          loading: false,
          session: null,
          refreshUserProfile: vi.fn(),
        } as any}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns recent active users when admin', async () => {
    vi.mocked(queries.getRecentActiveUsers).mockResolvedValue({
      data: mockRecentUsers,
      error: null,
    });

    const { result } = renderHook(() => useRecentActiveUsers(), {
      wrapper: createWrapper(mockAdminProfile),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRecentUsers);
    expect(queries.getRecentActiveUsers).toHaveBeenCalledWith(20);
  });

  it('passes custom limit to query function', async () => {
    vi.mocked(queries.getRecentActiveUsers).mockResolvedValue({
      data: mockRecentUsers,
      error: null,
    });

    const { result } = renderHook(() => useRecentActiveUsers(10), {
      wrapper: createWrapper(mockAdminProfile),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queries.getRecentActiveUsers).toHaveBeenCalledWith(10);
  });

  it('does not fetch when not admin', async () => {
    vi.mocked(queries.getRecentActiveUsers).mockResolvedValue({
      data: mockRecentUsers,
      error: null,
    });

    const { result } = renderHook(() => useRecentActiveUsers(), {
      wrapper: createWrapper(mockNonAdminProfile),
    });

    // Wait a bit to ensure no query is made
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(queries.getRecentActiveUsers).not.toHaveBeenCalled();
  });

  it('does not fetch when user is not logged in', async () => {
    vi.mocked(queries.getRecentActiveUsers).mockResolvedValue({
      data: mockRecentUsers,
      error: null,
    });

    const { result } = renderHook(() => useRecentActiveUsers(), {
      wrapper: createWrapper(null),
    });

    // Wait a bit to ensure no query is made
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.data).toBeUndefined();
    expect(queries.getRecentActiveUsers).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Failed to fetch');
    vi.mocked(queries.getRecentActiveUsers).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useRecentActiveUsers(), {
      wrapper: createWrapper(mockAdminProfile),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });
});
