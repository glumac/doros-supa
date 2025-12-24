import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFollowersList, getFollowingList } from '../lib/queries';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from './FollowButton';
import BlockButton from './BlockButton';
import { useIsFollowingUser } from '../hooks/useFollowStatus';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';

interface FollowersModalProps {
  userId: string;
  userName: string;
  initialTab?: 'followers' | 'following';
  onClose: () => void;
}

type TabType = 'followers' | 'following';

interface FollowUser {
  id: string;
  user_name: string;
  avatar_url?: string;
}

function FollowersModalRowActions({
  currentUserId,
  targetUserId,
  targetUserName,
  onBlocked,
}: {
  currentUserId: string | undefined;
  targetUserId: string;
  targetUserName: string;
  onBlocked: () => void;
}) {
  const { data: amIFollowing = false } = useIsFollowingUser(currentUserId, targetUserId);

  return (
    <div className="cq-followers-modal-item-actions" style={{ display: 'flex', alignItems: 'center' }}>
      <FollowButton userId={targetUserId} initialIsFollowing={amIFollowing} />
      {!amIFollowing && currentUserId && currentUserId !== targetUserId && (
        <>
          <span
            className="cq-followers-modal-item-block-separator"
            style={{ margin: "0 8px", color: "#111", opacity: 0.6, userSelect: "none" }}
          >
            ·
          </span>
          <BlockButton
            targetUserId={targetUserId}
            targetUserName={targetUserName}
            className="cq-followers-modal-item-block-button"
            onChanged={(next) => {
              // If we just blocked them, remove from list immediately.
              if (next.iBlocked) onBlocked();
            }}
          />
        </>
      )}
    </div>
  );
}

export default function FollowersModal({
  userId,
  userName,
  initialTab = 'followers',
  onClose
}: FollowersModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadData();
  }, [activeTab, page, userId]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const { data, count } = await getFollowersList(userId, page, pageSize);
        if (data) {
          const users = data.map((item: any) => item.users).filter(Boolean);
          setFollowers(users);
          setTotalCount(count || 0);
        }
      } else {
        const { data, count } = await getFollowingList(userId, page, pageSize);
        if (data) {
          const users = data.map((item: any) => item.users).filter(Boolean);
          setFollowing(users);
          setTotalCount(count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading followers/following:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const displayedUsers = activeTab === 'followers' ? followers : following;

  const removeUserFromList = (removedUserId: string) => {
    if (activeTab === 'followers') {
      setFollowers((prev) => prev.filter((u) => u.id !== removedUserId));
    } else {
      setFollowing((prev) => prev.filter((u) => u.id !== removedUserId));
    }
    setTotalCount((c) => Math.max(0, c - 1));
  };

  return (
    <div
      className="cq-followers-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="cq-followers-modal-container"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="cq-followers-modal-header"
          style={{
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 className="cq-followers-modal-title" style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
            {userName}
          </h2>
          <button
            onClick={onClose}
            className="cq-followers-modal-close-button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          className="cq-followers-modal-tabs"
          style={{
            display: 'flex',
            borderBottom: '1px solid #eee',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('followers');
              setPage(1);
            }}
            className={`cq-followers-modal-tab cq-followers-modal-tab-followers ${activeTab === 'followers' ? 'cq-followers-modal-tab-active' : ''}`}
            style={{
              flex: 1,
              padding: '16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'followers' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'followers' ? '#007bff' : '#666',
              fontWeight: activeTab === 'followers' ? '700' : '400',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            Followers
          </button>
          <button
            onClick={() => {
              setActiveTab('following');
              setPage(1);
            }}
            className={`cq-followers-modal-tab cq-followers-modal-tab-following ${activeTab === 'following' ? 'cq-followers-modal-tab-active' : ''}`}
            style={{
              flex: 1,
              padding: '16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'following' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'following' ? '#007bff' : '#666',
              fontWeight: activeTab === 'following' ? '700' : '400',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            Following
          </button>
        </div>

        {/* User List */}
        <div
          className="cq-followers-modal-list"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 0',
          }}
        >
          {loading ? (
            <div className="cq-followers-modal-loading" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading...
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="cq-followers-modal-empty" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No {activeTab} yet
            </div>
          ) : (
            displayedUsers.map((followUser) => (
              <div
                key={followUser.id}
                className="cq-followers-modal-item"
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <Link
                  to={`/user/${followUser.id}`}
                  onClick={onClose}
                  className="cq-followers-modal-item-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <img
                    src={followUser.avatar_url || getAvatarPlaceholder(44)}
                    alt={followUser.user_name}
                    className="cq-followers-modal-item-avatar"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                  <div className="cq-followers-modal-item-info" style={{ flex: 1 }}>
                    <div className="cq-followers-modal-item-name" style={{ fontWeight: '600', fontSize: '15px' }}>
                      {followUser.user_name}
                    </div>
                  </div>
                </Link>
                <FollowersModalRowActions
                  currentUserId={user?.id}
                  targetUserId={followUser.id}
                  targetUserName={followUser.user_name}
                  onBlocked={() => removeUserFromList(followUser.id)}
                />
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="cq-followers-modal-pagination"
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cq-followers-modal-pagination-prev"
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span className="cq-followers-modal-pagination-info" style={{ color: '#666', fontSize: '14px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="cq-followers-modal-pagination-next"
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
