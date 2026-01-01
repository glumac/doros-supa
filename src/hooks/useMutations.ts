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
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends", variables.myUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "followers", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "following", variables.myUserId] });
      queryClient.invalidateQueries({ queryKey: ["follow", "isFollowing", variables.myUserId, variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["followRequests", "status", variables.myUserId, variables.theirUserId] });
      // Invalidate user's pomodoros to immediately show/hide based on privacy
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros", variables.theirUserId] });
      // Invalidate feed as following affects what appears in feed
      queryClient.invalidateQueries({ queryKey: ["feed"] });
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
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends", variables.myUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "followers", variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["user", "following", variables.myUserId] });
      queryClient.invalidateQueries({ queryKey: ["follow", "isFollowing", variables.myUserId, variables.theirUserId] });
      queryClient.invalidateQueries({ queryKey: ["followRequests", "status", variables.myUserId, variables.theirUserId] });
      // Invalidate user's pomodoros to immediately show/hide based on privacy
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros", variables.theirUserId] });
      // Invalidate feed as unfollowing affects what appears in feed
      queryClient.invalidateQueries({ queryKey: ["feed"] });
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
      queryClient.invalidateQueries({ queryKey: ["followRequests", "status", variables.requesterId, variables.targetId] });
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
      queryClient.invalidateQueries({ queryKey: ["followRequests", "status", variables.requesterId, variables.targetId] });
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
      requesterId,
    }: {
      requestId: string;
      userId: string;
      requesterId?: string;
    }) => {
      const { error } = await approveFollowRequest(requestId, userId);
      if (error) throw error;
      return { requesterId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends", variables.userId] });
      // Invalidate the requester's view of our profile and pomodoros
      if (data?.requesterId) {
        queryClient.invalidateQueries({ queryKey: ["user", "pomodoros", variables.userId] });
      }
      // Invalidate feed as approved follow affects what appears in feed
      queryClient.invalidateQueries({ queryKey: ["feed"] });
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
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "followers", variables.blockerId] });
      queryClient.invalidateQueries({ queryKey: ["user", "following", variables.blockerId] });
      queryClient.invalidateQueries({ queryKey: ["user", "followers", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "following", variables.blockedId] });
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
      // Invalidate blocked users list
      queryClient.invalidateQueries({ queryKey: ["blocks", variables.blockerId] });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "public-profile", variables.blockedId] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros", variables.blockedId] });
      // Invalidate feed and leaderboard as unblocking affects visibility
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
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
        .update({ followers_only: isPrivate })
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

/**
 * Hook to create a new pomodoro
 */
export function useCreatePomodoroMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user_id,
      task,
      notes,
      completed,
      launch_at,
      image_url,
    }: {
      user_id: string;
      task: string;
      notes: string | null;
      completed: boolean;
      launch_at: string;
      image_url: string | null;
    }) => {
      const { data, error } = await supabase.from("pomodoros").insert({
        user_id,
        task,
        notes,
        completed,
        launch_at,
        image_url,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries that depend on pomodoro creation
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "global"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
    },
  });
}

/**
 * Hook to delete a pomodoro
 */
export function useDeletePomodoroMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pomodoroId: string) => {
      const { error } = await supabase
        .from("pomodoros")
        .delete()
        .eq("id", pomodoroId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all queries that might include this pomodoro
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
      queryClient.invalidateQueries({ queryKey: ["pomodoro"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

/**
 * Hook to delete a comment
 */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate queries that might display this comment
      queryClient.invalidateQueries({ queryKey: ["pomodoro"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
    },
  });
}

