import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  isFollowingUser,
  followUser,
  unfollowUser,
  getFollowRequestStatus,
  createFollowRequest,
  cancelFollowRequest,
  getUserProfile,
  isBlockedByUser,
} from '../lib/queries';

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
  const [followState, setFollowState] = useState<FollowState>(
    initialIsFollowing ? 'following' : 'not-following'
  );
  const [loading, setLoading] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (user && userId !== user.id) {
      // If initialIsFollowing is provided, use it but still check for requested status
      if (initialIsFollowing !== undefined) {
        // Still need to check if there's a pending request (edge case)
        checkFollowStatus(initialIsFollowing);
      } else {
        checkFollowStatus();
      }
      checkUserSettings();
      checkBlockStatus();
    }
  }, [user, userId, initialIsFollowing]);

  async function checkUserSettings() {
    const { data: targetUser } = await getUserProfile(userId);
    if (targetUser) {
      setRequiresApproval(targetUser.require_follow_approval || false);
    }
  }

  async function checkBlockStatus() {
    if (!user) return;
    const blocked = await isBlockedByUser(user.id, userId);
    setIsBlocked(blocked);
  }

  async function checkFollowStatus(initialFollowing?: boolean) {
    if (!user) return;

    // If initialFollowing is provided and true, set to following immediately
    // but still check for requested status as a fallback
    if (initialFollowing === true) {
      setFollowState('following');
      // Still check if there's a pending request (shouldn't happen, but be safe)
      const { data: request } = await getFollowRequestStatus(user.id, userId);
      if (request) {
        setFollowState('requested');
      }
      return;
    }

    // Check if already following
    const { isFollowing: following } = await isFollowingUser(user.id, userId);
    if (following) {
      setFollowState('following');
      return;
    }

    // Check if request is pending
    const { data: request } = await getFollowRequestStatus(user.id, userId);
    if (request) {
      setFollowState('requested');
    } else {
      setFollowState('not-following');
    }
  }

  async function handleToggleFollow() {
    if (!user) return;
    setLoading(true);

    try {
      if (followState === 'following') {
        // Unfollow
        await unfollowUser(user.id, userId);
        setFollowState('not-following');
        onFollowChange?.(false);
      } else if (followState === 'requested') {
        // Cancel request
        await cancelFollowRequest(user.id, userId);
        setFollowState('not-following');
      } else {
        // Follow or request to follow
        if (requiresApproval) {
          await createFollowRequest(user.id, userId);
          setFollowState('requested');
        } else {
          await followUser(user.id, userId);
          setFollowState('following');
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

  const buttonConfig = {
    'not-following': {
      text: 'Follow',
      bgColor: '#007bff',
      textColor: '#fff',
      border: 'none',
      cursor: 'pointer',
    },
    following: {
      text: 'Following',
      bgColor: '#fff',
      textColor: '#333',
      border: '1px solid #ddd',
      cursor: 'pointer',
    },
    requested: {
      text: 'Requested',
      bgColor: '#fff',
      textColor: '#007bff',
      border: '1px solid #007bff',
      cursor: 'pointer',
    },
  };

  const config = buttonConfig[followState];

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`follow-button ${followState} ${className}`}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: config.border,
        backgroundColor: config.bgColor,
        color: config.textColor,
        cursor: loading ? 'not-allowed' : config.cursor,
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s',
        opacity: loading ? 0.6 : 1
      }}
    >
      {loading ? '...' : config.text}
    </button>
  );
}
