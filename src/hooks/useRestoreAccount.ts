import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreAccount } from "../lib/queries";

/**
 * Hook to restore a soft-deleted user account
 * On success, clears the React Query cache
 */
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await restoreAccount(userId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();
    },
  });
}



