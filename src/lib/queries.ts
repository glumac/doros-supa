import { supabase } from "./supabaseClient";
import type { Database } from "../types/supabase";

type Pomodoro = Database["public"]["Tables"]["pomodoros"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

// Feed query - gets completed pomodoros (RLS automatically filters to visible ones)
// Note: Blocked users are filtered at the application level since RLS doesn't have user context
// feedType: 'global' = shows all public pomodoros (followers_only = false)
//          'following' = shows only pomodoros from users you follow
export async function getFeed(
  limit = 20,
  currentUserId?: string,
  feedType: 'global' | 'following' = 'global'
) {
  let query = supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name, avatar_url)),
      comments (id, comment_text, user_id, users:user_id (id, user_name, avatar_url))
    `
    )
    .eq("completed", true)
    .order("launch_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  // Filter based on feed type and blocking relationships
  if (currentUserId && data) {
    let filteredData = data;

    // For "following" feed, only show pomodoros from users you follow (or your own)
    if (feedType === 'following') {
      // Get list of users you're following
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      const followingIds = new Set(
        following?.map((f) => f.following_id) || []
      );
      // Include your own pomodoros and pomodoros from users you follow
      followingIds.add(currentUserId);

      filteredData = filteredData.filter(
        (pomodoro) => followingIds.has(pomodoro.user_id)
      );
    }

    // Filter out pomodoros in BOTH directions (blocking)
    // - Users the current user has blocked
    // - Users who have blocked the current user
    const { data: blocks } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

    const blockedByMe = new Set(
      blocks?.filter((b) => b.blocker_id === currentUserId).map((b) => b.blocked_id) || []
    );
    const blockedMe = new Set(
      blocks?.filter((b) => b.blocked_id === currentUserId).map((b) => b.blocker_id) || []
    );

    // Filter out pomodoros from users in either set
    filteredData = filteredData.filter(
      (pomodoro) => !blockedByMe.has(pomodoro.user_id) && !blockedMe.has(pomodoro.user_id)
    );

    return { data: filteredData, error };
  }

  return { data, error };
}

// Pomodoro detail query
export async function getPomodoroDetail(id: string, currentUserId?: string) {
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

  // Check if current user is blocked by the pomodoro creator
  if (currentUserId && data && data.user_id !== currentUserId) {
    const { data: blockCheck } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", data.user_id)
      .eq("blocked_id", currentUserId)
      .maybeSingle();

    if (blockCheck) {
      // Current user is blocked by pomodoro creator - return error
      return {
        data: null,
        error: new Error("You are blocked by this user and cannot view their content"),
      };
    }
  }

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
  pageSize: number = 20,
  currentUserId?: string
) {
  // Check if current user is blocked by the profile owner (defense in depth + better UX)
  if (currentUserId && currentUserId !== userId) {
    const { data: blockCheck } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", userId)
      .eq("blocked_id", currentUserId)
      .maybeSingle();

    if (blockCheck) {
      // Current user is blocked by profile owner - return empty results
      return { data: [], error: null, count: 0 };
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name, avatar_url)),
      comments (id, comment_text, user_id, users:user_id (id, user_name, avatar_url))
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
export async function getWeeklyLeaderboard(currentUserId?: string) {
  const { data, error } = await supabase.rpc("get_global_leaderboard", {
    p_current_user_id: currentUserId || null,
  });
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

// Follow a user (checks if user is blocked first)
export async function followUser(myUserId: string, theirUserId: string) {
  // Check if user is blocked
  const isBlocked = await isUserBlocked(myUserId, theirUserId);
  if (isBlocked) {
    return { data: null, error: new Error("You have blocked this user") };
  }

  const isBlockedBy = await isBlockedByUser(myUserId, theirUserId);
  if (isBlockedBy) {
    return { data: null, error: new Error("You are blocked by this user") };
  }

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
export async function getGlobalLeaderboard(currentUserId?: string) {
  const { data, error } = await supabase.rpc("get_global_leaderboard", {
    p_current_user_id: currentUserId || null,
  });
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

// Create a follow request (checks if user is blocked first)
export async function createFollowRequest(
  requesterId: string,
  targetId: string
) {
  // Check if requester is blocked by target
  const { data: blockCheck } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", targetId)
    .eq("blocked_id", requesterId)
    .maybeSingle();

  if (blockCheck) {
    return { data: null, error: new Error("You are blocked by this user") };
  }

  const { data, error } = await supabase.from("follow_requests").insert({
    requester_id: requesterId,
    target_id: targetId,
    status: "pending",
  });

  return { data, error };
}

// Approve a follow request
export async function approveFollowRequest(requestId: string, userId: string) {
  // Use database function to approve request (bypasses RLS)
  const { data, error } = await supabase.rpc("approve_follow_request", {
    p_request_id: requestId,
    p_approver_id: userId,
  });

  if (error) {
    console.error('Error approving follow request:', error);
    return { error };
  }

  // Check if the function returned an error
  if (data && data.error) {
    console.error('Error from approve function:', data.error);
    return { error: new Error(data.error) };
  }

  return { data, error: null };
}

// Reject a follow request (deletes request, allows re-request)
export async function rejectFollowRequest(requestId: string, userId: string) {
  // First verify the request exists and belongs to the user
  const { data: request, error: fetchError } = await supabase
    .from("follow_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("target_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching follow request for rejection:', fetchError);
    return { error: fetchError };
  }

  if (!request) {
    console.error('Follow request not found or already processed');
    return { error: new Error("Request not found or already processed") };
  }

  // Delete the request
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("id", requestId)
    .eq("target_id", userId);

  if (error) {
    console.error('Error deleting follow request:', error);
    return { error };
  }

  return { error: null };
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

// ============================================
// Blocking Functions
// ============================================

// Block a user
export async function blockUser(blockerId: string, blockedId: string) {
  // Check if already blocked
  const { data: existingBlock } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existingBlock) {
    // Already blocked, return success
    return { data: existingBlock, error: null };
  }

  // First, delete any pending follow requests where blocker is target and blocked is requester
  const { error: deleteReq1Error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("target_id", blockerId)
    .eq("requester_id", blockedId)
    .eq("status", "pending");

  if (deleteReq1Error) {
    console.warn('Error deleting follow request (1):', deleteReq1Error);
  }

  // Delete any pending follow requests where blocker is requester and blocked is target
  const { error: deleteReq2Error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", blockerId)
    .eq("target_id", blockedId)
    .eq("status", "pending");

  if (deleteReq2Error) {
    console.warn('Error deleting follow request (2):', deleteReq2Error);
  }

  // Remove any existing follow relationships (blocker following blocked)
  const { error: deleteFollow1Error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", blockerId)
    .eq("following_id", blockedId);

  if (deleteFollow1Error) {
    console.warn('Error deleting follow relationship (1):', deleteFollow1Error);
  }

  // Remove any existing follow relationships (blocked following blocker)
  const { error: deleteFollow2Error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", blockedId)
    .eq("following_id", blockerId);

  if (deleteFollow2Error) {
    console.warn('Error deleting follow relationship (2):', deleteFollow2Error);
  }

  // Create block record (use upsert to handle potential race condition)
  const { data, error } = await supabase
    .from("blocks")
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating block record:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Unblock a user
export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  return { error };
}

// Check if a user is blocked
export async function isUserBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  return !!data;
}

// Check if current user is blocked by another user
export async function isBlockedByUser(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", otherUserId)
    .eq("blocked_id", userId)
    .maybeSingle();

  return !!data;
}

// Get block status in both directions
// - iBlocked: currentUserId has blocked otherUserId
// - theyBlocked: otherUserId has blocked currentUserId
export async function getBlockStatus(currentUserId: string, otherUserId: string) {
  const [{ data: iBlockedRow }, { data: theyBlockedRow }] = await Promise.all([
    supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", otherUserId)
      .maybeSingle(),
    supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", otherUserId)
      .eq("blocked_id", currentUserId)
      .maybeSingle(),
  ]);

  return { iBlocked: !!iBlockedRow, theyBlocked: !!theyBlockedRow };
}

// Get list of blocked users
export async function getBlockedUsers(blockerId: string) {
  const { data, error } = await supabase
    .from("blocks")
    .select(
      `
      id,
      blocked_id,
      created_at,
      users:blocked_id (
        id,
        user_name,
        avatar_url
      )
    `
    )
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });

  return { data, error };
}

// ============================================
// Account Deletion Functions
// ============================================

// Soft delete an account
export async function softDeleteAccount(userId: string) {
  const { data, error } = await supabase.rpc("soft_delete_account", {
    p_user_id: userId,
  });

  return { data, error };
}

// Restore a soft-deleted account
export async function restoreAccount(userId: string) {
  const { data, error } = await supabase.rpc("restore_account", {
    p_user_id: userId,
  });

  return { data, error };
}

// ============================================
// Admin Dashboard Functions
// ============================================

// Get admin stats (aggregate metrics)
export async function getAdminStats(startDate?: string, endDate?: string) {
  const { data, error } = await supabase.rpc("get_admin_stats", {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  return { data: data?.[0] || null, error };
}

// Get daily pomodoro counts for charts
export async function getDailyPomodoroCounts(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("get_daily_pomodoro_counts", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}

// Get daily user signups for charts
export async function getDailyUserSignups(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("get_daily_user_signups", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}

// Get recently active users for admin dashboard
export async function getRecentActiveUsers(limit: number = 20) {
  const { data, error } = await supabase.rpc("get_recent_active_users", {
    p_limit: limit,
  });

  return { data, error };
}

// Update the current user's last_seen_at timestamp
export async function updateLastSeen() {
  return supabase.rpc("update_last_seen");
}

// User Stats queries
export async function getUserStats(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc("get_user_stats", {
    p_user_id: userId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  return { data: data?.[0] || null, error };
}

export async function getUserDailyCompletions(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc("get_user_daily_completions", {
    p_user_id: userId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  return { data, error };
}

export async function getUserWeeklyCompletions(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc("get_user_weekly_completions", {
    p_user_id: userId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  return { data, error };
}

export async function getUserMonthlyCompletions(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc("get_user_monthly_completions", {
    p_user_id: userId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  return { data, error };
}

/**
 * Find the first (oldest) completed pomodoro within a date range and its position in the full list.
 * Returns the pomodoro ID and the page number it would appear on (when sorted newest first).
 */
export async function findFirstPomodoroInRange(
  userId: string,
  startDate: string,
  endDate: string,
  pageSize: number = 20
): Promise<{ pomodoroId: string; pageNumber: number; totalCount: number } | null> {
  // Find the oldest pomodoro in the date range
  const { data: firstPomodoro, error: firstError } = await supabase
    .from("pomodoros")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true }) // Oldest first
    .limit(1)
    .maybeSingle();

  if (firstError || !firstPomodoro) {
    return null;
  }

  // Count how many pomodoros come AFTER this one (newer than it)
  // Since the list is sorted newest first, we need to count newer pomodoros
  const { count, error: countError } = await supabase
    .from("pomodoros")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .gt("created_at", firstPomodoro.created_at);

  if (countError) {
    return null;
  }

  // Position in descending list = count of newer pomodoros + 1
  const position = (count || 0) + 1;
  const pageNumber = Math.ceil(position / pageSize);

  // Get total count for reference
  const { count: totalCount } = await supabase
    .from("pomodoros")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  return {
    pomodoroId: firstPomodoro.id,
    pageNumber,
    totalCount: totalCount || 0,
  };
}
