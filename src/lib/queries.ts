import { supabase } from "./supabaseClient";
import type { Database } from "../types/supabase";

type Pomodoro = Database["public"]["Tables"]["pomodoros"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

// Feed query - gets completed pomodoros (RLS automatically filters to visible ones)
export async function getFeed(limit = 20) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name)),
      comments (id, comment_text, user_id, users:user_id (id, user_name))
    `
    )
    .eq("completed", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
}

// Pomodoro detail query
export async function getPomodoroDetail(id: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name, avatar_url)),
      comments (id, comment_text, user_id, created_at, users:user_id (id, user_name, avatar_url))
    `
    )
    .eq("id", id)
    .single();

  return { data, error };
}

// User profile query
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return { data, error };
}

// User's pomodoros query
export async function getUserPomodoros(userId: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name)),
      comments (id, comment_text, user_id, users:user_id (id, user_name))
    `
    )
    .eq("user_id", userId)
    .eq("completed", true)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Search query
export async function searchPomodoros(term: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select("*, users:user_id (*)")
    .or(`task.ilike.%${term}%,notes.ilike.%${term}%`)
    .eq("completed", true)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get leaderboard data for the week
export async function getWeeklyLeaderboard() {
  const { data, error } = await supabase.rpc("get_global_leaderboard");
  return { data, error };
}
