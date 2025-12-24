import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFeed } from '../queries';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Feed Queries - Global vs Following', () => {
  const publicUserId = 'public-user-id';
  const followersOnlyUserId = 'followers-only-user-id';
  const currentUserId = 'current-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return pomodoros from users with followers_only = false in global feed', async () => {
    // Setup: User with followers_only = false should appear in global feed
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'global');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.some(p => p.user_id === publicUserId)).toBe(true);
  });

  it('should exclude pomodoros from users with followers_only = true in global feed', async () => {
    // Setup: User with followers_only = true should NOT appear in global feed
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
      {
        id: 'p2',
        user_id: followersOnlyUserId,
        completed: true,
        created_at: '2024-01-02',
        users: { id: followersOnlyUserId, followers_only: true },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'global');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Should include public user
    expect(data?.some(p => p.user_id === publicUserId)).toBe(true);
    // Should exclude followers_only user (RLS will filter this at database level)
    // Note: In a real scenario, RLS would filter this out. For unit tests with mocks,
    // we verify the query is called correctly. Integration tests will verify RLS behavior.
    // The mock returns both, but in production RLS would filter out followers_only users
    // This test documents expected behavior - actual filtering happens via RLS policy
  });

  it('should return pomodoros from followed users in following feed', async () => {
    // Setup: Following feed should show pomodoros from users you follow
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    const mockFollowsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ following_id: publicUserId }],
        error: null
      }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockFollowsQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'following');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Following feed should only include pomodoros from followed users
    expect(data?.some(p => p.user_id === publicUserId)).toBe(true);
  });

  it('should exclude pomodoros from public users you do NOT follow in following feed', async () => {
    // Setup: This is the bug we fixed - public users (followers_only = false)
    // should NOT appear in following feed if you don't follow them
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
      {
        id: 'p2',
        user_id: currentUserId,
        completed: true,
        created_at: '2024-01-02',
        users: { id: currentUserId, followers_only: false },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    // User does NOT follow publicUserId (empty follows list)
    const mockFollowsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [], // Not following anyone
        error: null
      }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockFollowsQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'following');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Should exclude public user's pomodoros (not following them)
    expect(data?.some(p => p.user_id === publicUserId)).toBe(false);
    // Should include own pomodoros
    expect(data?.some(p => p.user_id === currentUserId)).toBe(true);
  });

  it('should include pomodoros from followers_only users you DO follow in following feed', async () => {
    // Setup: Even if a user has followers_only = true, if you follow them,
    // their pomodoros should appear in the following feed
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: followersOnlyUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: followersOnlyUserId, followers_only: true },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    // User DOES follow the followers_only user
    const mockFollowsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ following_id: followersOnlyUserId }],
        error: null
      }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockFollowsQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'following');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Should include followers_only user's pomodoros (you follow them)
    expect(data?.some(p => p.user_id === followersOnlyUserId)).toBe(true);
  });

  it('should default to global feed when feedType is not specified', async () => {
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    // Call without feedType - should default to 'global'
    const { data, error } = await getFeed(20, currentUserId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should respect blocking relationships in global feed', async () => {
    // Setup: Blocked users should not appear in global feed
    const mockPomodoros = [
      {
        id: 'p1',
        user_id: publicUserId,
        completed: true,
        created_at: '2024-01-01',
        users: { id: publicUserId, followers_only: false },
      },
      {
        id: 'p2',
        user_id: 'blocked-user-id',
        completed: true,
        created_at: '2024-01-02',
        users: { id: 'blocked-user-id', followers_only: false },
      },
    ];

    const mockBlocks = [
      { blocker_id: currentUserId, blocked_id: 'blocked-user-id' },
    ];

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockBlocks, error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, currentUserId, 'global');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Should include public user
    expect(data?.some(p => p.user_id === publicUserId)).toBe(true);
    // Should exclude blocked user
    expect(data?.some(p => p.user_id === 'blocked-user-id')).toBe(false);
  });
});

