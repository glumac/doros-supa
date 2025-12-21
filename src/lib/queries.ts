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

// Get suggested users based on mutual followers and engagement
export async function getSuggestedUsers(currentUserId: string, limit = 15) {
  const { data, error } = await supabase.rpc("get_suggested_users", {
    current_user_id: currentUserId,
    result_limit: limit,
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

// ============================================
// Follow Requests Functions
// ============================================

// Get count of pending follow requests for a user
export async function getPendingFollowRequestsCount(userId: string) {
  const { data, error } = await supabase.rpc(
    "get_pending_follow_requests_count",
    {
      user_id: userId,
    }
  );
  return { count: data || 0, error };
}

// Get all pending follow requests for a user
export async function getPendingFollowRequests(userId: string) {
  const { data, error } = await supabase
    .from("follow_requests")
    .select(
      `
      id,
      requester_id,
      created_at,
      users:requester_id (
        id,
        user_name,
        avatar_url
      )
    `
    )
    .eq("target_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return { data, error };
}

// Check if a follow request exists
export async function getFollowRequestStatus(
  requesterId: string,
  targetId: string
) {
  const { data, error } = await supabase
    .from("follow_requests")
    .select("id, status")
    .eq("requester_id", requesterId)
    .eq("target_id", targetId)
    .eq("status", "pending")
    .maybeSingle();

  return { data, error };
}

// Create a follow request
export async function createFollowRequest(
  requesterId: string,
  targetId: string
) {
  const { data, error } = await supabase.from("follow_requests").insert({
    requester_id: requesterId,
    target_id: targetId,
    status: "pending",
  });

  return { data, error };
}

// Approve a follow request
export async function approveFollowRequest(requestId: string, userId: string) {
  // Get request details
  const { data: request, error: fetchError } = await supabase
    .from("follow_requests")
    .select("requester_id, target_id")
    .eq("id", requestId)
    .eq("target_id", userId)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    return { error: fetchError || new Error("Request not found") };
  }

  // Create the follow relationship
  const { error: followError } = await supabase.from("follows").insert({
    follower_id: request.requester_id,
    following_id: request.target_id,
  });

  if (followError) return { error: followError };

  // Mark request as approved
  const { error: updateError } = await supabase
    .from("follow_requests")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return { error: updateError };
}

// Reject a follow request
export async function rejectFollowRequest(requestId: string, userId: string) {
  const { error } = await supabase
    .from("follow_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("target_id", userId)
    .eq("status", "pending");

  return { error };
}

// Cancel a sent follow request
export async function cancelFollowRequest(
  requesterId: string,
  targetId: string
) {
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", requesterId)
    .eq("target_id", targetId)
    .eq("status", "pending");

  return { error };
}

// ============================================
// Followers/Following Lists (Paginated)
// ============================================

// Get paginated followers list for a user
export async function getFollowersList(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("follows")
    .select(
      `
      follower_id,
      created_at,
      users:follower_id (
        id,
        user_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
}

// Get paginated following list for a user
export async function getFollowingList(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("follows")
    .select(
      `
      following_id,
      created_at,
      users:following_id (
        id,
        user_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
}
