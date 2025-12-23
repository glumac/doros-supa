import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useSearchUsers, useSuggestedUsers } from '../useUserSearch';
import * as queries from '../../lib/queries';

// Mock queries
vi.mock('../../lib/queries', () => ({
  searchUsers: vi.fn(),
  getSuggestedUsers: vi.fn(),
}));

describe('useSearchUsers', () => {
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

  it('should search users successfully', async () => {
    const mockSearchResults = [
      {
        user_id: 'user-1',
        user_name: 'John Doe',
        avatar_url: 'https://example.com/john.jpg',
        is_following: false,
        follower_count: 5,
        completion_count: 10,
      },
    ];

    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    const { result } = renderHook(
      () => useSearchUsers('John', 'current-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSearchResults);
    expect(queries.searchUsers).toHaveBeenCalledWith('John', 'current-user');
  });

  it('should not fetch when searchTerm is empty', () => {
    const { result } = renderHook(
      () => useSearchUsers('', 'current-user'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(queries.searchUsers).not.toHaveBeenCalled();
  });

  it('should not fetch when currentUserId is undefined', () => {
    const { result } = renderHook(
      () => useSearchUsers('John', undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(queries.searchUsers).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(
      () => useSearchUsers('John', 'current-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(queries.searchUsers).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(
      () => useSearchUsers('test', 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify query key structure
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const searchQuery = allQueries.find(
      (q) => q.queryKey[0] === 'users' && q.queryKey[1] === 'search'
    );
    expect(searchQuery?.queryKey).toEqual(['users', 'search', 'test', 'user-123']);
  });
});

describe('useSuggestedUsers', () => {
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

  it('should fetch suggested users successfully', async () => {
    const mockSuggestedUsers = [
      {
        user_id: 'user-1',
        user_name: 'Suggested User',
        avatar_url: 'https://example.com/suggested.jpg',
        is_following: false,
        follower_count: 10,
        completion_count: 20,
      },
    ];

    vi.mocked(queries.getSuggestedUsers).mockResolvedValue({
      data: mockSuggestedUsers,
      error: null,
    });

    const { result } = renderHook(
      () => useSuggestedUsers('current-user', 15),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSuggestedUsers);
    expect(queries.getSuggestedUsers).toHaveBeenCalledWith('current-user', 15);
  });

  it('should use default limit of 15', async () => {
    vi.mocked(queries.getSuggestedUsers).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(
      () => useSuggestedUsers('current-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queries.getSuggestedUsers).toHaveBeenCalledWith('current-user', 15);
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(
      () => useSuggestedUsers(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(queries.getSuggestedUsers).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Database error');
    vi.mocked(queries.getSuggestedUsers).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(
      () => useSuggestedUsers('current-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(queries.getSuggestedUsers).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(
      () => useSuggestedUsers('user-123', 20),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify query key structure
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const suggestedQuery = allQueries.find(
      (q) => q.queryKey[0] === 'users' && q.queryKey[1] === 'suggested'
    );
    expect(suggestedQuery?.queryKey).toEqual(['users', 'suggested', 'user-123', 20]);
  });
});

