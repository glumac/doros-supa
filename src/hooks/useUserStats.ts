import { useQuery } from "@tanstack/react-query";
import {
  getUserStats,
  getUserDailyCompletions,
  getUserWeeklyCompletions,
  getUserMonthlyCompletions
} from "../lib/queries";

export interface UserStatsData {
  total_pomodoros: number;
  completed_pomodoros: number;
  active_days: number;
  total_days: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface WeeklyDataPoint {
  week_start: string;
  count: number;
}

export interface MonthlyDataPoint {
  month_start: string;
  count: number;
}

export function useUserStats(
  userId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery<UserStatsData | null>({
    queryKey: ["user", "stats", userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getUserStats(userId, startDate, endDate);
      if (error) throw error;
      return data as UserStatsData | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserDailyCompletions(
  userId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["user", "daily-completions", userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getUserDailyCompletions(userId, startDate, endDate);
      if (error) throw error;
      return (data as unknown as ChartDataPoint[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserWeeklyCompletions(
  userId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery<WeeklyDataPoint[]>({
    queryKey: ["user", "weekly-completions", userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getUserWeeklyCompletions(userId, startDate, endDate);
      if (error) throw error;
      return (data as unknown as WeeklyDataPoint[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserMonthlyCompletions(
  userId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery<MonthlyDataPoint[]>({
    queryKey: ["user", "monthly-completions", userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data, error } = await getUserMonthlyCompletions(userId, startDate, endDate);
      if (error) throw error;
      return (data as unknown as MonthlyDataPoint[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
