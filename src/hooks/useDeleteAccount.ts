import { useMutation, useQueryClient } from "@tanstack/react-query";
import { softDeleteAccount } from "../lib/queries";
import { supabase } from "../lib/supabaseClient";

/**
 * Hook to soft delete a user account
 * On success, signs out the user and clears the React Query cache
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await softDeleteAccount(userId);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Clear all cached queries first
      queryClient.clear();
      // Sign out the user - handle potential errors
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Log but don't throw - the account is already deleted
        // User will be signed out on next page load anyway
        console.error("Error signing out after account deletion:", error);
      }
    },
  });
}

