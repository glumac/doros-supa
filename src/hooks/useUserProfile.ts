import { useQuery } from "@tanstack/react-query";
import {
  getUserProfile,
  getUserPomodoros,
  getPublicUserProfile,
  getPendingFollowRequestsCount,
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
} from "../lib/queries";

/**
 * Hook to fetch a user's profile
 * @param userId - User ID to fetch profile for
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", "profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getUserProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a user's public profile (with privacy settings applied)
 * @param userId - User ID to fetch profile for
 * @param currentUserId - Current logged-in user ID
 */
export function usePublicUserProfile(
  userId: string | undefined,
  currentUserId: string | null
) {
  return useQuery({
    queryKey: ["user", "public-profile", userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getPublicUserProfile(userId, currentUserId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a user's pomodoros with pagination
 * @param userId - User ID to fetch pomodoros for
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param currentUserId - Optional current user ID for blocking checks
 */
export function useUserPomodoros(
  userId: string | undefined,
  page: number = 1,
  pageSize: number = 20,
  currentUserId?: string
) {
  return useQuery({
    queryKey: ["user", "pomodoros", userId, page, pageSize, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error, count } = await getUserPomodoros(
        userId,
        page,
        pageSize,
        currentUserId
      );
      if (error) throw error;
      return { data, count };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook to fetch count of pending follow requests for current user
 * @param userId - Current user ID
 */
export function usePendingFollowRequestsCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["followRequests", "count", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { count, error } = await getPendingFollowRequestsCount(userId);
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Hook to fetch a user's followers
 * @param userId - User ID to fetch followers for
 */
export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", "followers", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getFollowers(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch users that a user is following
 * @param userId - User ID to fetch following list for
 */
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", "following", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getFollowing(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch pending follow requests for a user
 * @param userId - User ID to fetch follow requests for
 */
export function usePendingFollowRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["followRequests", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getPendingFollowRequests(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - follow requests change frequently
  });
}

