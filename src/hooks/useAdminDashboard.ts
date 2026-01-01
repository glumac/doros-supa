import { useQuery } from "@tanstack/react-query";
import {
  getAdminStats,
  getDailyPomodoroCounts,
  getDailyUserSignups,
} from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook to check if current user is admin
 * Returns loading=true until both auth and profile are loaded
 */
export function useIsAdmin() {
  const { userProfile, loading, user } = useAuth();

  // Still loading if:
  // 1. Auth is still loading, OR
  // 2. We have a user but profile hasn't loaded yet
  const isLoading = loading || (!!user && userProfile === null);

  return {
    isAdmin: userProfile?.is_admin === true,
    loading: isLoading,
  };
}

/**
 * Hook to fetch admin dashboard stats
 * @param startDate - Optional start date filter (ISO string)
 * @param endDate - Optional end date filter (ISO string)
 */
export function useAdminStats(startDate?: string, endDate?: string) {
  const { isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin", "stats", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await getAdminStats(startDate, endDate);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes - admin data doesn't need to be super fresh
  });
}

/**
 * Hook to fetch daily pomodoro counts for charts
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export function useDailyPomodoros(startDate: string, endDate: string) {
  const { isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin", "dailyPomodoros", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await getDailyPomodoroCounts(startDate, endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch daily user signups for charts
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export function useDailySignups(startDate: string, endDate: string) {
  const { isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin", "dailySignups", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await getDailyUserSignups(startDate, endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}
