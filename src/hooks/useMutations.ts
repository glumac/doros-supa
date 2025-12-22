import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import {
  followUser,
  unfollowUser,
  createFollowRequest,
  cancelFollowRequest,
  approveFollowRequest,
  rejectFollowRequest,
  blockUser,
  unblockUser,
} from "../lib/queries";

/**
 * Hook to like a pomodoro
 */
export function useLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pomodoroId,
      userId,
    }: {
      pomodoroId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("likes")
        .insert({ pomodoro_id: pomodoroId, user_id: userId });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries that depend on likes
      queryClient.invalidateQueries({ queryKey: ["pomodoro", variables.pomodoroId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
    },
  });
}

/**
 * Hook to unlike a pomodoro
 */
export function useUnlikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pomodoroId,
      userId,
    }: {
      pomodoroId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("pomodoro_id", pomodoroId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries that depend on likes
      queryClient.invalidateQueries({ queryKey: ["pomodoro", variables.pomodoroId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
    },
  });
}

/**
 * Hook to add a comment to a pomodoro
 */
export function useCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pomodoroId,
      userId,
      commentText,
    }: {
      pomodoroId: string;
      userId: string;
      commentText: string;
    }) => {
      const { data, error } = await supabase.from("comments").insert({
        pomodoro_id: pomodoroId,
        user_id: userId,
        comment_text: commentText,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries that depend on comments
      queryClient.invalidateQueries({ queryKey: ["pomodoro", variables.pomodoroId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
    },
  });
}

/**
 * Hook to follow a user (for public profiles)
 */
export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      myUserId,
      theirUserId,
    }: {
      myUserId: string;
      theirUserId: string;
    }) => {
      const { data, error } = await followUser(myUserId, theirUserId);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate leaderboard and profile queries
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.theirUserId] });
    },
  });
}

/**
 * Hook to unfollow a user
 */
export function useUnfollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      myUserId,
      theirUserId,
    }: {
      myUserId: string;
      theirUserId: string;
    }) => {
      const { error } = await unfollowUser(myUserId, theirUserId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate leaderboard and profile queries
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.theirUserId] });
    },
  });
}

/**
 * Hook to create a follow request (for private profiles)
 */
export function useCreateFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requesterId,
      targetId,
    }: {
      requesterId: string;
      targetId: string;
    }) => {
      const { data, error } = await createFollowRequest(requesterId, targetId);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.targetId] });
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

/**
 * Hook to cancel a follow request
 */
export function useCancelFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requesterId,
      targetId,
    }: {
      requesterId: string;
      targetId: string;
    }) => {
      const { error } = await cancelFollowRequest(requesterId, targetId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.targetId] });
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

/**
 * Hook to approve a follow request
 */
export function useApproveFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      userId,
    }: {
      requestId: string;
      userId: string;
    }) => {
      const { error } = await approveFollowRequest(requestId, userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
    },
  });
}

/**
 * Hook to reject a follow request
 */
export function useRejectFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      userId,
    }: {
      requestId: string;
      userId: string;
    }) => {
      const { error } = await rejectFollowRequest(requestId, userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

/**
 * Hook to block a user
 */
export function useBlockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockerId,
      blockedId,
    }: {
      blockerId: string;
      blockedId: string;
    }) => {
      const { data, error } = await blockUser(blockerId, blockedId);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

/**
 * Hook to unblock a user
 */
export function useUnblockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockerId,
      blockedId,
    }: {
      blockerId: string;
      blockedId: string;
    }) => {
      const { error } = await unblockUser(blockerId, blockedId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to update privacy settings
 */
export function useUpdatePrivacyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isPrivate,
    }: {
      userId: string;
      isPrivate: boolean;
    }) => {
      const { data, error } = await supabase
        .from("users")
        .update({ is_private: isPrivate })
        .eq("id", userId);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.userId] });
    },
  });
}

