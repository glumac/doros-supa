import { useQuery } from "@tanstack/react-query";
import { getGlobalLeaderboard, getFriendsLeaderboard } from "../lib/queries";

/**
 * Hook to fetch global leaderboard data
 * @param currentUserId - Optional current user ID for personalized data
 */
export function useGlobalLeaderboard(currentUserId?: string) {
  return useQuery({
    queryKey: ["leaderboard", "global", currentUserId],
    queryFn: async () => {
      const { data, error } = await getGlobalLeaderboard(currentUserId);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - leaderboard changes frequently
  });
}

/**
 * Hook to fetch friends leaderboard data
 * @param userId - Current user ID (required)
 */
export function useFriendsLeaderboard(userId: string | undefined) {
  return useQuery({
    queryKey: ["leaderboard", "friends", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getFriendsLeaderboard(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId, // Only run query if userId is provided
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

