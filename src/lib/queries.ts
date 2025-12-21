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
export async function getUserPomodoros(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name)),
      comments (id, comment_text, user_id, users:user_id (id, user_name))
    `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .eq("completed", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
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

// ============================================
// Following System Functions
// ============================================

// Get users I'm following
export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, users:following_id(*)")
    .eq("follower_id", userId);

  return { data, error };
}

// Get my followers
export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, users:follower_id(*)")
    .eq("following_id", userId);

  return { data, error };
}

// Check if following a user
export async function isFollowingUser(myUserId: string, theirUserId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", myUserId)
    .eq("following_id", theirUserId)
    .maybeSingle();

  return { isFollowing: !!data, error };
}

// Follow a user
export async function followUser(myUserId: string, theirUserId: string) {
  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: myUserId, following_id: theirUserId });

  return { data, error };
}

// Unfollow a user
export async function unfollowUser(myUserId: string, theirUserId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myUserId)
    .eq("following_id", theirUserId);

  return { error };
}

// Get global leaderboard (all users)
export async function getGlobalLeaderboard() {
  const { data, error } = await supabase.rpc("get_global_leaderboard");
  return { data, error };
}

// Get friends leaderboard (followed users + self)
export async function getFriendsLeaderboard(userId: string) {
  const { data, error } = await supabase.rpc("get_friends_leaderboard", {
    p_user_id: userId,
  });
  return { data, error };
}

// Search users by name
export async function searchUsers(searchTerm: string, currentUserId: string) {
  const { data, error } = await supabase.rpc("search_users", {
    search_term: searchTerm,
    current_user_id: currentUserId,
  });
  return { data, error };
}

// Get public user profile
export async function getPublicUserProfile(
  userId: string,
  currentUserId: string | null
) {
  const { data, error } = await supabase.rpc("get_public_user_profile", {
    profile_user_id: userId,
    current_user_id: currentUserId || '',
  });
  return { data, error };
}
