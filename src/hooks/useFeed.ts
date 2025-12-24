import { useQuery } from "@tanstack/react-query";
import { getFeed, searchPomodoros, getPomodoroDetail } from "../lib/queries";

/**
 * Hook to fetch the main feed of pomodoros
 * @param limit - Number of pomodoros to fetch
 * @param currentUserId - Optional current user ID for filtering blocked users
 */
export function useFeed(limit: number = 20, currentUserId?: string) {
  return useQuery({
    queryKey: ["feed", limit, currentUserId],
    queryFn: async () => {
      const { data, error } = await getFeed(limit, currentUserId);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to search pomodoros by term
 * @param searchTerm - Search term to filter pomodoros
 */
export function useSearchPomodoros(searchTerm: string) {
  return useQuery({
    queryKey: ["feed", "search", searchTerm],
    queryFn: async () => {
      const { data, error } = await searchPomodoros(searchTerm);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length > 0, // Only search if there's a term
    staleTime: 1000 * 60 * 5, // 5 minutes - search results are more stable
  });
}

/**
 * Hook to fetch a single pomodoro's details
 * @param pomodoroId - ID of the pomodoro to fetch
 * @param currentUserId - Optional current user ID for blocking checks
 */
export function usePomodoroDetail(pomodoroId: string | undefined, currentUserId?: string) {
  return useQuery({
    queryKey: ["pomodoro", pomodoroId, currentUserId],
    queryFn: async () => {
      if (!pomodoroId) throw new Error("Pomodoro ID is required");
      const { data, error } = await getPomodoroDetail(pomodoroId, currentUserId);
      if (error) throw error;
      return data;
    },
    enabled: !!pomodoroId,
  });
}

