import { useQuery } from "@tanstack/react-query";
import { getBlockedUsers } from "../lib/queries";

/**
 * Hook to fetch blocked users for the current user
 * @param userId - Current user ID
 */
export function useBlockedUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ["blocks", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getBlockedUsers(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}



