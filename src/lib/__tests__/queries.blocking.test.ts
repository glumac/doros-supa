import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFeed, getUserPomodoros, getPomodoroDetail } from '../queries';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Bidirectional Blocking - Feed Query', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';
  const user3Id = 'user-3-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter out pomodoros from users who have blocked the current user', async () => {
    // Setup: User 1 has blocked User 2
    // User 2 tries to view feed - should NOT see User 1's pomodoros

    const mockPomodoros = [
      { id: 'p1', user_id: user1Id, completed: true, created_at: '2024-01-01' },
      { id: 'p2', user_id: user3Id, completed: true, created_at: '2024-01-02' },
    ];

    const mockBlocks = [
      { blocker_id: user1Id, blocked_id: user2Id }, // User 1 blocked User 2
    ];

    // Mock pomodoros query
    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPomodoros, error: null }),
    };

    // Mock blocks query - should fetch blocks where user2 is blocker OR blocked
    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockBlocks, error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodorosQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getFeed(20, user2Id);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // User 2 should NOT see User 1's pomodoros (p1 should be filtered out)
    expect(data?.some(p => p.user_id === user1Id)).toBe(false);
    // User 2 should still see User 3's pomodoros
    expect(data?.some(p => p.user_id === user3Id)).toBe(true);
  });

  it('should filter out pomodoros from users the current user has blocked', async () => {
    // Setup: User 2 has blocked User 1
    // User 2 tries to view feed - should NOT see User 1's pomodoros

    const mockPomodoros = [
      { id: 'p1', user_id: user1Id, completed: true, created_at: '2024-01-01' },
      { id: 'p2', user_id: user3Id, completed: true, created_at: '2024-01-02' },
    ];

    const mockBlocks = [
      { blocker_id: user2Id, blocked_id: user1Id }, // User 2 blocked User 1
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

    const { data, error } = await getFeed(20, user2Id);

    expect(error).toBeNull();
    // User 2 should NOT see User 1's pomodoros
    expect(data?.some(p => p.user_id === user1Id)).toBe(false);
  });

  it('should use optimized single query for blocks in both directions', async () => {
    const mockPomodoros = [
      { id: 'p1', user_id: user1Id, completed: true, created_at: '2024-01-01' },
    ];

    const mockBlocks = [
      { blocker_id: user1Id, blocked_id: user2Id }, // User 1 blocked User 2
      { blocker_id: user3Id, blocked_id: user2Id }, // User 3 blocked User 2
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

    await getFeed(20, user2Id);

    // Verify blocks query uses .or() to get both directions in one query
    expect(mockBlocksQuery.or).toHaveBeenCalled();
    const orCall = mockBlocksQuery.or.mock.calls[0][0];
    expect(orCall).toContain('blocker_id.eq.user-2-id');
    expect(orCall).toContain('blocked_id.eq.user-2-id');
  });
});

describe('Bidirectional Blocking - User Pomodoros Query', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty results if current user is blocked by profile owner', async () => {
    // Setup: User 1 has blocked User 2
    // User 2 tries to view User 1's profile pomodoros - should get empty results

    const mockBlocks = [
      { blocker_id: user1Id, blocked_id: user2Id },
    ];

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockBlocks[0], error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockBlocksQuery as any);

    const { data, count } = await getUserPomodoros(user1Id, 1, 20, user2Id);

    expect(data).toEqual([]);
    expect(count).toBe(0);
  });

  it('should return pomodoros if current user is not blocked by profile owner', async () => {
    // Setup: User 1 has NOT blocked User 2
    // User 2 should be able to see User 1's pomodoros (if following)

    const mockPomodoros = [
      { id: 'p1', user_id: user1Id, completed: true },
    ];

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockPomodorosQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockPomodoros,
        error: null,
        count: 1
      }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockBlocksQuery as any)
      .mockReturnValueOnce(mockPomodorosQuery as any);

    const { data, count } = await getUserPomodoros(user1Id, 1, 20, user2Id);

    expect(data).toBeDefined();
    expect(count).toBeGreaterThan(0);
  });
});

describe('Bidirectional Blocking - Pomodoro Detail Query', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if current user is blocked by pomodoro creator', async () => {
    // Setup: User 1 has blocked User 2
    // User 2 tries to view User 1's pomodoro via direct link - should fail

    const mockPomodoro = {
      id: 'p1',
      user_id: user1Id,
      completed: true,
    };

    const mockBlocks = [
      { blocker_id: user1Id, blocked_id: user2Id },
    ];

    const mockPomodoroQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPomodoro, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockBlocks[0], error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodoroQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getPomodoroDetail('p1', user2Id);

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });

  it('should return pomodoro if current user is not blocked by creator', async () => {
    const mockPomodoro = {
      id: 'p1',
      user_id: user1Id,
      completed: true,
    };

    const mockPomodoroQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPomodoro, error: null }),
    };

    const mockBlocksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockPomodoroQuery as any)
      .mockReturnValueOnce(mockBlocksQuery as any);

    const { data, error } = await getPomodoroDetail('p1', user2Id);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.id).toBe('p1');
  });
});

