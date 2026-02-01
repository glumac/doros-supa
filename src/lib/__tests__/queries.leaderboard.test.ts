import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGlobalLeaderboard, getFriendsLeaderboard } from '../queries';
import { supabase } from '../supabaseClient';

vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('Leaderboard Queries - Data Shape Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGlobalLeaderboard', () => {
    it('should return data with user_id field (not id)', async () => {
      const mockLeaderboardData = [
        {
          user_id: 'user-123',
          user_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          completion_count: 10,
        },
        {
          user_id: 'user-456',
          user_name: 'Another User',
          avatar_url: 'https://example.com/avatar2.jpg',
          completion_count: 5,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockLeaderboardData,
        error: null,
      } as any);

      const { data, error } = await getGlobalLeaderboard('current-user-id');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      // Critical: Verify each item has user_id field, not id
      data?.forEach((item) => {
        expect(item).toHaveProperty('user_id');
        expect(item.user_id).toBeTruthy();
        expect(typeof item.user_id).toBe('string');
        
        // Ensure it doesn't have 'id' field instead
        expect(item).not.toHaveProperty('id');
        
        // Verify other required fields
        expect(item).toHaveProperty('user_name');
        expect(item).toHaveProperty('avatar_url');
        expect(item).toHaveProperty('completion_count');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_global_leaderboard', {
        p_current_user_id: 'current-user-id',
      });
    });

    it('should handle null currentUserId parameter', async () => {
      const mockLeaderboardData = [
        {
          user_id: 'user-123',
          user_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          completion_count: 10,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockLeaderboardData,
        error: null,
      } as any);

      const { data } = await getGlobalLeaderboard();

      expect(data).toBeDefined();
      expect(data?.[0]).toHaveProperty('user_id');
      expect(supabase.rpc).toHaveBeenCalledWith('get_global_leaderboard', {
        p_current_user_id: null,
      });
    });

    it('should handle errors from database', async () => {
      const mockError = { message: 'Database error', code: 'PGRST123' };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      const { data, error } = await getGlobalLeaderboard('current-user-id');

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });

    it('should return empty array when no users on leaderboard', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      const { data, error } = await getGlobalLeaderboard('current-user-id');

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('getFriendsLeaderboard', () => {
    it('should return data with user_id field (not id)', async () => {
      const mockFriendsData = [
        {
          user_id: 'friend-123',
          user_name: 'Friend One',
          avatar_url: 'https://example.com/friend.jpg',
          completion_count: 15,
          is_following: true,
        },
        {
          user_id: 'current-user',
          user_name: 'Me',
          avatar_url: 'https://example.com/me.jpg',
          completion_count: 12,
          is_following: true,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockFriendsData,
        error: null,
      } as any);

      const { data, error } = await getFriendsLeaderboard('current-user');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      // Critical: Verify each item has user_id field, not id
      data?.forEach((item) => {
        expect(item).toHaveProperty('user_id');
        expect(item.user_id).toBeTruthy();
        expect(typeof item.user_id).toBe('string');
        
        // Ensure it doesn't have 'id' field instead
        expect(item).not.toHaveProperty('id');
        
        // Verify other required fields
        expect(item).toHaveProperty('user_name');
        expect(item).toHaveProperty('avatar_url');
        expect(item).toHaveProperty('completion_count');
        expect(item).toHaveProperty('is_following');
        expect(typeof item.is_following).toBe('boolean');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_friends_leaderboard', {
        p_user_id: 'current-user',
      });
    });

    it('should handle errors from database', async () => {
      const mockError = { message: 'Database error', code: 'PGRST123' };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      const { data, error } = await getFriendsLeaderboard('current-user');

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });

    it('should return empty array when user has no friends', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      const { data, error } = await getFriendsLeaderboard('current-user');

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
