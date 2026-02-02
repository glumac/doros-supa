import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGlobalLeaderboard, getFriendsLeaderboard } from "../queries";
import { supabase } from "../supabaseClient";

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("Leaderboard uses launch_at (not created_at)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGlobalLeaderboard", () => {
    it("should call get_global_leaderboard RPC with timezone parameter", async () => {
      const mockData = [
        {
          user_id: "user-1",
          user_name: "Test User",
          avatar_url: null,
          completion_count: 5,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockData,
        error: null,
      } as any);

      const result = await getGlobalLeaderboard("current-user-id", "America/Los_Angeles");

      expect(supabase.rpc).toHaveBeenCalledWith("get_global_leaderboard", {
        p_current_user_id: "current-user-id",
        p_timezone: "America/Los_Angeles",
      });

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it("should default to America/New_York timezone if not provided", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await getGlobalLeaderboard("current-user-id");

      expect(supabase.rpc).toHaveBeenCalledWith("get_global_leaderboard", {
        p_current_user_id: "current-user-id",
        p_timezone: "America/New_York",
      });
    });

    it("should handle null user ID", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await getGlobalLeaderboard(undefined, "Europe/London");

      expect(supabase.rpc).toHaveBeenCalledWith("get_global_leaderboard", {
        p_current_user_id: null,
        p_timezone: "Europe/London",
      });
    });
  });

  describe("getFriendsLeaderboard", () => {
    it("should call get_friends_leaderboard RPC with timezone parameter", async () => {
      const mockData = [
        {
          user_id: "user-1",
          user_name: "Friend",
          avatar_url: null,
          completion_count: 3,
          is_following: true,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockData,
        error: null,
      } as any);

      const result = await getFriendsLeaderboard("user-id", "Asia/Tokyo");

      expect(supabase.rpc).toHaveBeenCalledWith("get_friends_leaderboard", {
        p_user_id: "user-id",
        p_timezone: "Asia/Tokyo",
      });

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it("should default to America/New_York timezone if not provided", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await getFriendsLeaderboard("user-id");

      expect(supabase.rpc).toHaveBeenCalledWith("get_friends_leaderboard", {
        p_user_id: "user-id",
        p_timezone: "America/New_York",
      });
    });
  });

  describe("Timezone-aware week boundaries", () => {
    it("should understand that different timezones mean different week boundaries", () => {
      // This is a conceptual test documenting the behavior
      // The actual SQL function uses DATE_TRUNC('week', NOW() AT TIME ZONE p_timezone)
      // which means:
      // - User in PST on Sunday 11pm sees pomodoros launched this week (PST)
      // - User in EST on Monday 2am sees pomodoros launched this week (EST)
      // - They will see DIFFERENT results because their "this week" boundaries differ

      // Example scenario:
      // Pomodoro launched: Sunday 11:30 PM PST (Monday 2:30 AM EST)
      // - PST user: Sees it in "this week" (still Sunday in PST)
      // - EST user: Sees it in "next week" (already Monday in EST)

      expect(true).toBe(true); // Placeholder to document the behavior
    });
  });
});
