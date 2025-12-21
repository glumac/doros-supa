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
} from '../lib/queries';

interface FollowButtonProps {
  userId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

type FollowState = 'not-following' | 'following' | 'requested';

export default function FollowButton({
  userId,
  className = '',
  onFollowChange
}: FollowButtonProps) {
  const { user } = useAuth();
  const [followState, setFollowState] = useState<FollowState>('not-following');
  const [loading, setLoading] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (user && userId !== user.id) {
      checkFollowStatus();
      checkUserSettings();
    }
  }, [user, userId]);

  async function checkUserSettings() {
    const { data: targetUser } = await getUserProfile(userId);
    if (targetUser) {
      setRequiresApproval(targetUser.require_follow_approval || false);
    }
  }

  async function checkFollowStatus() {
    if (!user) return;

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

  // Don't show button if not logged in or viewing own profile
  if (!user || userId === user.id) return null;

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
