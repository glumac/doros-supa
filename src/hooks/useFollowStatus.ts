import { useQuery } from "@tanstack/react-query";
import { getBlockStatus, getFollowRequestStatus, isBlockedByUser, isFollowingUser } from "../lib/queries";

export function useIsFollowingUser(
  myUserId: string | undefined,
  theirUserId: string | undefined,
  initialIsFollowing?: boolean
) {
  return useQuery({
    queryKey: ["follow", "isFollowing", myUserId, theirUserId],
    queryFn: async () => {
      if (!myUserId || !theirUserId) throw new Error("User IDs are required");
      const { isFollowing, error } = await isFollowingUser(myUserId, theirUserId);
      if (error) throw error;
      return isFollowing;
    },
    enabled: !!myUserId && !!theirUserId && myUserId !== theirUserId,
    staleTime: 1000 * 30, // 30s
    initialData: initialIsFollowing,
  });
}

export function useHasPendingFollowRequest(
  requesterId: string | undefined,
  targetId: string | undefined
) {
  return useQuery({
    queryKey: ["followRequests", "status", requesterId, targetId],
    queryFn: async () => {
      if (!requesterId || !targetId) throw new Error("User IDs are required");
      const { data, error } = await getFollowRequestStatus(requesterId, targetId);
      if (error) throw error;
      return !!data;
    },
    enabled: !!requesterId && !!targetId && requesterId !== targetId,
    staleTime: 1000 * 15, // 15s
  });
}

export function useIsBlockedByUser(
  currentUserId: string | undefined,
  otherUserId: string | undefined
) {
  return useQuery({
    queryKey: ["blocks", "isBlockedBy", currentUserId, otherUserId],
    queryFn: async () => {
      if (!currentUserId || !otherUserId) throw new Error("User IDs are required");
      return await isBlockedByUser(currentUserId, otherUserId);
    },
    enabled: !!currentUserId && !!otherUserId && currentUserId !== otherUserId,
    staleTime: 1000 * 60 * 2, // 2m
  });
}

export function useBlockStatus(
  currentUserId: string | undefined,
  otherUserId: string | undefined
) {
  return useQuery({
    queryKey: ["blocks", "status", currentUserId, otherUserId],
    queryFn: async () => {
      if (!currentUserId || !otherUserId) throw new Error("User IDs are required");
      return await getBlockStatus(currentUserId, otherUserId);
    },
    enabled: !!currentUserId && !!otherUserId && currentUserId !== otherUserId,
    staleTime: 1000 * 60 * 2, // 2m
  });
}


