import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isFollowingUser, followUser, unfollowUser } from '../lib/queries';

interface FollowButtonProps {
  userId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ 
  userId, 
  className = '', 
  onFollowChange 
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userId !== user.id) {
      checkFollowStatus();
    }
  }, [user, userId]);

  async function checkFollowStatus() {
    if (!user) return;
    const { isFollowing: following } = await isFollowingUser(user.id, userId);
    setIsFollowing(following);
  }

  async function handleToggleFollow() {
    if (!user) return;
    setLoading(true);

    try {
      if (isFollowing) {
        await unfollowUser(user.id, userId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followUser(user.id, userId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't show button if not logged in or viewing own profile
  if (!user || userId === user.id) return null;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`follow-button ${isFollowing ? 'following' : ''} ${className}`}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: isFollowing ? '1px solid #ddd' : 'none',
        backgroundColor: isFollowing ? '#fff' : '#007bff',
        color: isFollowing ? '#333' : '#fff',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s',
        opacity: loading ? 0.6 : 1
      }}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
