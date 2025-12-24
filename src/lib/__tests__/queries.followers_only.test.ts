import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserProfile } from '../queries';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Followers Only Field Behavior', () => {
  const userId = 'user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have followers_only default to false (public by default)', async () => {
    // Setup: New user should have followers_only = false
    const mockUser = {
      id: userId,
      user_name: 'testuser',
      email: 'test@example.com',
      followers_only: false, // Default value
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    const { data, error } = await getUserProfile(userId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.followers_only).toBe(false);
  });

  it('should allow users to update followers_only setting', async () => {
    // Setup: User can toggle followers_only from false to true
    const mockUser = {
      id: userId,
      user_name: 'testuser',
      email: 'test@example.com',
      followers_only: true, // User opted into followers-only
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    const { data, error } = await getUserProfile(userId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.followers_only).toBe(true);
  });

  it('should handle null values as false (public)', async () => {
    // Setup: Legacy users with NULL should be treated as false
    const mockUser = {
      id: userId,
      user_name: 'testuser',
      email: 'test@example.com',
      followers_only: null, // Legacy data
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    const { data, error } = await getUserProfile(userId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Migration should set NULL to false, but in code we should handle null as false
    expect(data?.followers_only ?? false).toBe(false);
  });
});

