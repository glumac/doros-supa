import { useState } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from '../contexts/AuthContext';
import {
  useFollowMutation,
  useUnfollowMutation,
  useCreateFollowRequestMutation,
  useCancelFollowRequestMutation,
} from '../hooks/useMutations';
import { useUserProfile } from "../hooks/useUserProfile";
import { useHasPendingFollowRequest, useIsBlockedByUser, useIsFollowingUser } from "../hooks/useFollowStatus";

interface FollowButtonProps {
  userId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  initialIsFollowing?: boolean;
}

type FollowState = 'not-following' | 'following' | 'requested';

export default function FollowButton({
  userId,
  className = '',
  onFollowChange,
  initialIsFollowing
}: FollowButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // React Query mutations
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const createRequestMutation = useCreateFollowRequestMutation();
  const cancelRequestMutation = useCancelFollowRequestMutation();

  const { data: targetUser } = useUserProfile(userId);
  const requiresApproval = !!targetUser?.require_follow_approval;

  const { data: isBlocked = false, isLoading: isLoadingBlockStatus } = useIsBlockedByUser(
    user?.id,
    userId
  );
  const { data: isFollowing = false, isLoading: isLoadingFollowing } = useIsFollowingUser(
    user?.id,
    userId,
    initialIsFollowing
  );
  const { data: hasPendingRequest = false, isLoading: isLoadingRequestStatus } = useHasPendingFollowRequest(
    user?.id,
    userId
  );

  const checking =
    !user ||
    userId === user.id ||
    isLoadingBlockStatus ||
    isLoadingRequestStatus ||
    (initialIsFollowing === undefined && isLoadingFollowing);

  const followState: FollowState = isFollowing
    ? "following"
    : hasPendingRequest
      ? "requested"
      : "not-following";

  async function handleToggleFollow() {
    if (!user) return;
    setLoading(true);

    try {
      if (followState === 'following') {
        // Unfollow
        await unfollowMutation.mutateAsync({
          myUserId: user.id,
          theirUserId: userId,
        });
        queryClient.setQueryData(["follow", "isFollowing", user.id, userId], false);
        queryClient.setQueryData(["followRequests", "status", user.id, userId], false);
        onFollowChange?.(false);
      } else if (followState === 'requested') {
        // Cancel request
        await cancelRequestMutation.mutateAsync({
          requesterId: user.id,
          targetId: userId,
        });
        queryClient.setQueryData(["followRequests", "status", user.id, userId], false);
      } else {
        // Follow or request to follow
        if (!targetUser) return;
        if (requiresApproval) {
          await createRequestMutation.mutateAsync({
            requesterId: user.id,
            targetId: userId,
          });
          queryClient.setQueryData(["followRequests", "status", user.id, userId], true);
        } else {
          await followMutation.mutateAsync({
            myUserId: user.id,
            theirUserId: userId,
          });
          queryClient.setQueryData(["follow", "isFollowing", user.id, userId], true);
          queryClient.setQueryData(["followRequests", "status", user.id, userId], false);
          onFollowChange?.(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't show button if not logged in, viewing own profile, or blocked
  if (!user || userId === user.id || isBlocked) return null;

  // Don't render button until we've checked the status (prevents flash)
  if (checking) return null;

  const base =
    "cq-follow-button inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all";

  const stateClasses: Record<FollowState, string> = {
    "not-following": "bg-blue-600 text-white hover:bg-blue-700",
    following: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
    requested: "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50",
  };

  const disabledClasses = loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer";
  const disableForUnknownPrivacy = followState === "not-following" && !targetUser;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading || disableForUnknownPrivacy}
      className={`${base} ${stateClasses[followState]} ${disabledClasses} cq-follow-button-${followState} ${className}`}
    >
      {loading
        ? "..."
        : followState === "following"
          ? "Following"
          : followState === "requested"
            ? "Requested"
            : "Follow"}
    </button>
  );
}
