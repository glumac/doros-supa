import { useQuery } from "@tanstack/react-query";
import { searchUsers, getSuggestedUsers } from "../lib/queries";

/**
 * Hook to search users by name
 * @param searchTerm - Search term to filter users
 * @param currentUserId - Current logged-in user ID
 */
export function useSearchUsers(searchTerm: string, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["users", "search", searchTerm, currentUserId],
    queryFn: async () => {
      if (!currentUserId || !searchTerm.trim()) {
        throw new Error("User ID and search term are required");
      }
      const { data, error } = await searchUsers(searchTerm, currentUserId);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length > 0 && !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get suggested users based on mutual followers and engagement
 * @param userId - Current user ID
 * @param limit - Maximum number of suggested users to return
 */
export function useSuggestedUsers(userId: string | undefined, limit: number = 15) {
  return useQuery({
    queryKey: ["users", "suggested", userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getSuggestedUsers(userId, limit);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes - suggestions don't change frequently
  });
}

