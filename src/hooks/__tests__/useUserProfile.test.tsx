import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useFollowers, useFollowing, usePendingFollowRequests } from '../useUserProfile';
import * as queries from '../../lib/queries';

// Mock queries
vi.mock('../../lib/queries', () => ({
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  getPendingFollowRequests: vi.fn(),
}));

describe('useFollowers', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch followers successfully', async () => {
    const mockFollowers = [
      {
        follower_id: 'follower-1',
        users: {
          id: 'follower-1',
          user_name: 'Follower One',
          avatar_url: 'https://example.com/follower1.jpg',
        },
      },
    ];

    vi.mocked(queries.getFollowers).mockResolvedValue({
      data: mockFollowers,
      error: null,
    });

    const { result } = renderHook(() => useFollowers('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFollowers);
    expect(queries.getFollowers).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useFollowers(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(queries.getFollowers).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    vi.mocked(queries.getFollowers).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useFollowers('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(queries.getFollowers).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useFollowers('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const followersQuery = allQueries.find(
      (q) => q.queryKey[0] === 'user' && q.queryKey[1] === 'followers'
    );
    expect(followersQuery?.queryKey).toEqual(['user', 'followers', 'user-123']);
  });
});

describe('useFollowing', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch following list successfully', async () => {
    const mockFollowing = [
      {
        following_id: 'following-1',
        users: {
          id: 'following-1',
          user_name: 'Following One',
          avatar_url: 'https://example.com/following1.jpg',
        },
      },
    ];

    vi.mocked(queries.getFollowing).mockResolvedValue({
      data: mockFollowing,
      error: null,
    });

    const { result } = renderHook(() => useFollowing('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFollowing);
    expect(queries.getFollowing).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useFollowing(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(queries.getFollowing).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    vi.mocked(queries.getFollowing).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useFollowing('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(queries.getFollowing).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useFollowing('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const followingQuery = allQueries.find(
      (q) => q.queryKey[0] === 'user' && q.queryKey[1] === 'following'
    );
    expect(followingQuery?.queryKey).toEqual(['user', 'following', 'user-123']);
  });
});

describe('usePendingFollowRequests', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch pending follow requests successfully', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        requester_id: 'requester-1',
        created_at: '2024-01-01T00:00:00Z',
        users: {
          id: 'requester-1',
          user_name: 'Requester One',
          avatar_url: 'https://example.com/requester1.jpg',
        },
      },
    ];

    vi.mocked(queries.getPendingFollowRequests).mockResolvedValue({
      data: mockRequests,
      error: null,
    });

    const { result } = renderHook(() => usePendingFollowRequests('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRequests);
    expect(queries.getPendingFollowRequests).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => usePendingFollowRequests(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(queries.getPendingFollowRequests).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    vi.mocked(queries.getPendingFollowRequests).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => usePendingFollowRequests('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(queries.getPendingFollowRequests).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => usePendingFollowRequests('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const requestsQuery = allQueries.find(
      (q) => q.queryKey[0] === 'followRequests' && q.queryKey.length === 2
    );
    expect(requestsQuery?.queryKey).toEqual(['followRequests', 'user-123']);
  });
});

