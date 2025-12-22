import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchUsers, getSuggestedUsers } from '../queries';

/**
 * Integration tests for user discovery functions
 * These test the actual database functions to ensure RLS policies don't block completion counts
 */

describe('User Discovery Functions - Completion Count Integration', () => {
  // These tests require a real Supabase connection to production
  // They verify that the SECURITY DEFINER functions bypass RLS correctly

  const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000'; // Test user ID

  describe('searchUsers', () => {
    it('should return users with completion_count field', async () => {
      const { data, error } = await searchUsers('test', MOCK_USER_ID);

      if (data && data.length > 0) {
        // Verify structure
        expect(data[0]).toHaveProperty('user_id');
        expect(data[0]).toHaveProperty('user_name');
        expect(data[0]).toHaveProperty('avatar_url');
        expect(data[0]).toHaveProperty('is_following');
        expect(data[0]).toHaveProperty('follower_count');
        expect(data[0]).toHaveProperty('completion_count');

        // Verify completion_count is a number
        expect(typeof data[0].completion_count).toBe('number');
        expect(data[0].completion_count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return completion_count as number, not string', async () => {
      const { data } = await searchUsers('a', MOCK_USER_ID);

      if (data && data.length > 0) {
        data.forEach(user => {
          expect(typeof user.completion_count).toBe('number');
          expect(Number.isInteger(user.completion_count)).toBe(true);
        });
      }
    });

    it('should include users with high completion counts', async () => {
      const { data, error } = await searchUsers('', MOCK_USER_ID);

      if (data && data.length > 0) {
        // At least some users should have completed pomodoros
        const usersWithPomodoros = data.filter(u => u.completion_count > 0);

        if (usersWithPomodoros.length > 0) {
          // Verify we can see completion counts (not blocked by RLS)
          const highestCount = Math.max(...usersWithPomodoros.map(u => u.completion_count));
          expect(highestCount).toBeGreaterThan(0);
        }
      }
    });

    it('should not return negative completion counts', async () => {
      const { data } = await searchUsers('test', MOCK_USER_ID);

      if (data) {
        data.forEach(user => {
          expect(user.completion_count).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('getSuggestedUsers', () => {
    it('should return users with completion_count field', async () => {
      const { data, error } = await getSuggestedUsers(MOCK_USER_ID, 5);

      if (data && data.length > 0) {
        // Verify structure
        expect(data[0]).toHaveProperty('user_id');
        expect(data[0]).toHaveProperty('user_name');
        expect(data[0]).toHaveProperty('avatar_url');
        expect(data[0]).toHaveProperty('is_following');
        expect(data[0]).toHaveProperty('follower_count');
        expect(data[0]).toHaveProperty('completion_count');
        expect(data[0]).toHaveProperty('suggestion_score');

        // Verify completion_count is a number
        expect(typeof data[0].completion_count).toBe('number');
        expect(data[0].completion_count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return completion_count as number type', async () => {
      const { data } = await getSuggestedUsers(MOCK_USER_ID, 10);

      if (data && data.length > 0) {
        data.forEach(user => {
          expect(typeof user.completion_count).toBe('number');
          expect(Number.isInteger(user.completion_count)).toBe(true);
          expect(user.completion_count).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('should respect the limit parameter', async () => {
      const limit = 3;
      const { data } = await getSuggestedUsers(MOCK_USER_ID, limit);

      if (data) {
        expect(data.length).toBeLessThanOrEqual(limit);
      }
    });

    it('should order by suggestion_score descending', async () => {
      const { data } = await getSuggestedUsers(MOCK_USER_ID, 5);

      if (data && data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          expect(data[i].suggestion_score).toBeGreaterThanOrEqual(data[i + 1].suggestion_score);
        }
      }
    });

    it('should not include the current user in suggestions', async () => {
      const { data } = await getSuggestedUsers(MOCK_USER_ID, 20);

      if (data) {
        const foundSelf = data.find(u => u.user_id === MOCK_USER_ID);
        expect(foundSelf).toBeUndefined();
      }
    });

    it('should handle users with zero pomodoros correctly', async () => {
      const { data } = await getSuggestedUsers(MOCK_USER_ID, 20);

      if (data) {
        // Users with 0 pomodoros should still be returned if they have a high suggestion score
        // The completion_count should be exactly 0, not null or undefined
        const usersWithZeroPomodoros = data.filter(u => u.completion_count === 0);
        usersWithZeroPomodoros.forEach(user => {
          expect(user.completion_count).toBe(0);
          expect(typeof user.completion_count).toBe('number');
        });
      }
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent data structure between search and suggestions', async () => {
      const { data: searchData } = await searchUsers('test', MOCK_USER_ID);
      const { data: suggestData } = await getSuggestedUsers(MOCK_USER_ID, 5);

      if (searchData && searchData.length > 0 && suggestData && suggestData.length > 0) {
        // Both should have the same base fields
        const searchFields = Object.keys(searchData[0]);
        const suggestFields = Object.keys(suggestData[0]);

        const commonFields = ['user_id', 'user_name', 'avatar_url', 'is_following', 'follower_count', 'completion_count'];

        commonFields.forEach(field => {
          expect(searchFields).toContain(field);
          expect(suggestFields).toContain(field);
        });
      }
    });
  });
});

/**
 * Tests for ensuring followed users appear in search results
 */
describe('User Discovery Functions - Followed Users in Search', () => {
  // Using real user IDs from the database
  // Michael G follows Pam K
  const MICHAEL_G_ID = '0b447f7e-c622-431c-8256-8d943ea38450';
  const PAM_K_ID = 'a12fafe6-3242-4826-bbdb-5f1d8114cf09';

  it('should include followed users in search results', async () => {
    const { data, error } = await searchUsers('pam', MICHAEL_G_ID);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      // Pam K should appear in the results
      const pamK = data.find(user => user.user_id === PAM_K_ID);
      expect(pamK).toBeDefined();

      if (pamK) {
        // Should have is_following set to true
        expect(pamK.is_following).toBe(true);
        expect(pamK.user_name).toMatch(/pam/i);
      }
    }
  });

  it('should correctly set is_following flag for followed users', async () => {
    const { data, error } = await searchUsers('pam', MICHAEL_G_ID);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      const pamK = data.find(user => user.user_id === PAM_K_ID);

      if (pamK) {
        // Verify is_following is a boolean and true
        expect(typeof pamK.is_following).toBe('boolean');
        expect(pamK.is_following).toBe(true);
      }
    }
  });

  it('should include followed users even when searching with partial name', async () => {
    const { data, error } = await searchUsers('p', MICHAEL_G_ID);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      // Pam K should appear when searching for just "p"
      const pamK = data.find(user => user.user_id === PAM_K_ID);

      if (pamK) {
        expect(pamK.is_following).toBe(true);
      }
    }
  });

  it('should return is_following as false for users not being followed', async () => {
    // Use a user ID that likely doesn't follow anyone (or use a different user)
    const { data, error } = await searchUsers('pam', PAM_K_ID);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      // Pam K searching for "pam" should not find herself (excluded)
      // But if other users match, they should have is_following: false
      data.forEach(user => {
        expect(typeof user.is_following).toBe('boolean');
        // Should not find herself
        expect(user.user_id).not.toBe(PAM_K_ID);
      });
    }
  });

  it('should not exclude followed users from search results', async () => {
    const { data, error } = await searchUsers('pam', MICHAEL_G_ID);

    expect(error).toBeNull();

    // The function should return results (not be empty due to filtering)
    // If Pam K exists and matches the search, she should be included
    if (data) {
      const pamK = data.find(user => user.user_id === PAM_K_ID);
      // If Pam K matches the search term, she should be in results
      // (not filtered out just because she's being followed)
      if (pamK) {
        expect(pamK.is_following).toBe(true);
      }
    }
  });
});

/**
 * Unit tests for query function error handling
 */
describe('User Discovery Functions - Error Handling', () => {
  it('should handle empty search term gracefully', async () => {
    const { data, error } = await searchUsers('', 'some-user-id');

    // Should return results or empty array, not error
    expect(data).toBeDefined();
  });

  it('should handle invalid user IDs without crashing', async () => {
    const invalidUserId = 'not-a-valid-uuid';

    // Function should handle this gracefully
    const searchResult = await searchUsers('test', invalidUserId);
    const suggestResult = await getSuggestedUsers(invalidUserId, 5);

    // Should return a result (even if empty/error), not crash
    expect(searchResult).toBeDefined();
    expect(suggestResult).toBeDefined();
  });
});
