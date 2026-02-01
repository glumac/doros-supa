import { useState, useRef } from 'react';
import LogoutButton from './LogoutButton';
// ...existing code...
import { ProfileTabs } from './ProfileTabs';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useUserProfile, useFollowers, useFollowing } from '../hooks/useUserProfile';
import { useBlockedUsers } from '../hooks/useBlockedUsers';
import { useUpdatePrivacyMutation, useUnblockUserMutation, useUpdateNotificationPreferencesMutation } from '../hooks/useMutations';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';
import { removeStyle } from '../utils/styleDefs';
import DeleteAccountModal from './DeleteAccountModal';

export default function PrivacySettings() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Use React Query hooks
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile(user?.id);
  const { data: blockedUsers = [], isLoading: loadingBlocks } = useBlockedUsers(user?.id);
  const { data: followers } = useFollowers(user?.id);
  const { data: following } = useFollowing(user?.id);
  const updatePrivacyMutation = useUpdatePrivacyMutation();
  const unblockMutation = useUnblockUserMutation();
  const updateNotificationsMutation = useUpdateNotificationPreferencesMutation();

  const followerCount = followers?.length ?? 0;
  const followingCount = following?.length ?? 0;
  const requireApproval = userProfile?.followers_only || false;

  const emailFollowRequests = userProfile?.notification_preferences?.email_follow_requests || false;
  const emailLikes = userProfile?.notification_preferences?.email_likes || false;
  const emailComments = userProfile?.notification_preferences?.email_comments || false;

  async function handleToggle() {
    if (!user) return;

    try {
      await updatePrivacyMutation.mutateAsync({
        userId: user.id,
        isPrivate: !requireApproval,
      });
      setMessage('Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setMessage('Failed to update settings');
    }
  }

  async function handleUnblock(blockedId: string) {
    if (!user) return;
    try {
      await unblockMutation.mutateAsync({
        blockerId: user.id,
        blockedId,
      });
      setMessage('User unblocked successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error unblocking user:', error);
      setMessage('Failed to unblock user');
    }
  }

  async function handleNotificationToggle(preference: 'email_follow_requests' | 'email_likes' | 'email_comments', value: boolean) {
    if (!user) return;
    try {
      await updateNotificationsMutation.mutateAsync({
        userId: user.id,
        preferences: { [preference]: value },
      });
      setMessage('Notification preferences updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      setMessage('Failed to update preferences');
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Please log in to access privacy settings
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Loading...
      </div>
    );
  }

  const saving = updatePrivacyMutation.isPending;

  return (
    <div className="cq-user-profile-container relative pb-2 h-full justify-center items-center">
      <div className="cq-user-profile-content flex flex-col pb-5">
        <div className="cq-user-profile-header relative flex flex-col mb-4">
          <div className="cq-user-stats-banner-container flex flex-col justify-center items-center">
            <img
              className="cq-user-stats-banner w-full h-28 2xl:h-40 shadow-lg object-cover"
              src="/tomatoes-header.jpg"
              alt="Profile banner"
            />
            <img
              className="cq-user-stats-avatar rounded-full w-20 h-20 -mt-10 shadow-xl object-cover"
              src={userProfile?.avatar_url || getAvatarPlaceholder(80)}
              alt="user-pic"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getAvatarPlaceholder(80);
              }}
            />
          </div>
          <div className="cq-user-profile-name-row w-full mt-3 px-4 md:px-8">
            <div className="flex items-center justify-between">
              <div className="w-20" />
              <h1 className="cq-user-profile-name text-green-700 font-medium text-5xl text-center flex-1">
                {userProfile?.user_name}
              </h1>
              <LogoutButton />
            </div>
          </div>
          <div className="cq-user-profile-stats flex justify-center gap-6 mt-3 mb-2">
            <div className="cq-user-profile-followers-button text-center">
              <div className="cq-user-profile-followers-count font-bold text-lg">{followerCount}</div>
              <div className="cq-user-profile-followers-label text-gray-600 text-sm">Followers</div>
            </div>
            <div className="cq-user-profile-following-button text-center">
              <div className="cq-user-profile-following-count font-bold text-lg">{followingCount}</div>
              <div className="cq-user-profile-following-label text-gray-600 text-sm">Following</div>
            </div>
          </div>
        </div>
        {/* Tabs placed higher, as in My Stats */}
        {user?.id && (
          <ProfileTabs userId={user.id} />
        )}
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="cq-privacy-settings-title" style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Settings
          </h1>
          <p className="cq-privacy-settings-description" style={{ color: '#666', marginBottom: '32px' }}>
            Manage who can follow you and see your content
          </p>

          <div
        className="cq-privacy-settings-approval-section"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          className="cq-privacy-settings-approval-content"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <div className="cq-privacy-settings-approval-info" style={{ flex: 1 }}>
            <h3 className="cq-privacy-settings-approval-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Followers Only
            </h3>
            <p className="cq-privacy-settings-approval-description" style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              When enabled, users must send a follow request before they can follow you.</p>
              <p className="cq-privacy-settings-approval-description" style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0, marginTop: '8px' }}>
              You'll be able to approve or decline each request. Your weekly pomodoro totals will still appear on the global leaderboard, and your total pomodoro count will still be visible in search. However, individual pomodoros will only be visible to approved followers and will not appear in the global feed. When disabled, your pomodoros appear in the global feed and anyone can follow you instantly.
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={saving}
            className={`cq-privacy-settings-approval-toggle ${requireApproval ? 'cq-privacy-settings-approval-toggle-enabled' : 'cq-privacy-settings-approval-toggle-disabled'}`}
            style={{
              position: 'relative',
              width: '50px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              backgroundColor: requireApproval ? '#007bff' : '#ccc',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              className="cq-privacy-settings-approval-toggle-slider"
              style={{
                position: 'absolute',
                top: '2px',
                left: requireApproval ? '24px' : '2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>

        {message && (
          <div
            className={`cq-privacy-settings-message ${message.includes('success') ? 'cq-privacy-settings-message-success' : 'cq-privacy-settings-message-error'}`}
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
              color: message.includes('success') ? '#155724' : '#721c24',
              fontSize: '14px',
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* Email Notifications Section */}
      <div
        className="cq-privacy-settings-notifications-section"
        style={{
          marginTop: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 className="cq-privacy-settings-notifications-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          Email Notifications
        </h3>
        <p className="cq-privacy-settings-notifications-description" style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Choose which activities trigger email notifications
        </p>

        {/* Email Comments Toggle */}
        <div
          className="cq-privacy-settings-notification-item"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            paddingBottom: '16px',
            marginBottom: '16px',
            borderBottom: '1px solid #e9ecef',
          }}
        >
          <div className="cq-privacy-settings-notification-info" style={{ flex: 1 }}>
            <h4 className="cq-privacy-settings-notification-label" style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              New Comments
            </h4>
            <p className="cq-privacy-settings-notification-description" style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Receive an email when someone comments on your pomodoro
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('email_comments', !emailComments)}
            disabled={updateNotificationsMutation.isPending}
            className={`cq-privacy-settings-notification-toggle ${emailComments ? 'cq-privacy-settings-notification-toggle-enabled' : 'cq-privacy-settings-notification-toggle-disabled'}`}
            style={{
              position: 'relative',
              width: '50px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: updateNotificationsMutation.isPending ? 'not-allowed' : 'pointer',
              backgroundColor: emailComments ? '#007bff' : '#ccc',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              className="cq-privacy-settings-notification-toggle-slider"
              style={{
                position: 'absolute',
                top: '2px',
                left: emailComments ? '24px' : '2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>

        {/* Email Likes Toggle - Hidden until feature is implemented */}
        <div
          className="cq-privacy-settings-notification-item cq-privacy-settings-email-likes"
          style={{
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            paddingBottom: '16px',
            marginBottom: '16px',
            borderBottom: '1px solid #e9ecef',
          }}
        >
          <div className="cq-privacy-settings-notification-info" style={{ flex: 1 }}>
            <h4 className="cq-privacy-settings-notification-label" style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              New Likes
            </h4>
            <p className="cq-privacy-settings-notification-description" style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Receive an email when someone likes your pomodoro
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('email_likes', !emailLikes)}
            disabled={updateNotificationsMutation.isPending}
            className={`cq-privacy-settings-notification-toggle ${emailLikes ? 'cq-privacy-settings-notification-toggle-enabled' : 'cq-privacy-settings-notification-toggle-disabled'}`}
            style={{
              position: 'relative',
              width: '50px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: updateNotificationsMutation.isPending ? 'not-allowed' : 'pointer',
              backgroundColor: emailLikes ? '#007bff' : '#ccc',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              className="cq-privacy-settings-notification-toggle-slider"
              style={{
                position: 'absolute',
                top: '2px',
                left: emailLikes ? '24px' : '2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>

        {/* Email Follow Requests Toggle - Hidden until feature is implemented */}
        <div
          className="cq-privacy-settings-notification-item cq-privacy-settings-email-follow-requests"
          style={{
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <div className="cq-privacy-settings-notification-info" style={{ flex: 1 }}>
            <h4 className="cq-privacy-settings-notification-label" style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              New Follow Requests
            </h4>
            <p className="cq-privacy-settings-notification-description" style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Receive an email when someone requests to follow you
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('email_follow_requests', !emailFollowRequests)}
            disabled={updateNotificationsMutation.isPending}
            className={`cq-privacy-settings-notification-toggle ${emailFollowRequests ? 'cq-privacy-settings-notification-toggle-enabled' : 'cq-privacy-settings-notification-toggle-disabled'}`}
            style={{
              position: 'relative',
              width: '50px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: updateNotificationsMutation.isPending ? 'not-allowed' : 'pointer',
              backgroundColor: emailFollowRequests ? '#007bff' : '#ccc',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              className="cq-privacy-settings-notification-toggle-slider"
              style={{
                position: 'absolute',
                top: '2px',
                left: emailFollowRequests ? '24px' : '2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Blocked Users Section */}
      <div
        className="cq-privacy-settings-blocked-section"
        style={{
          marginTop: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 className="cq-privacy-settings-blocked-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Blocked Users
        </h3>
        <p className="cq-privacy-settings-blocked-description" style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          Users you have blocked cannot follow you, see your content, or send you follow requests. They will not appear in your leader boards, feeds, or suggested users.
        </p>

        {loadingBlocks ? (
          <div className="cq-privacy-settings-blocked-loading" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading blocked users...
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="cq-privacy-settings-blocked-empty" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No blocked users
          </div>
        ) : (
          <div className="cq-privacy-settings-blocked-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blockedUsers.map((block: any) => (
              <div
                key={block.id}
                className="cq-privacy-settings-blocked-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                }}
              >
                <div className="cq-privacy-settings-blocked-item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={block.users?.avatar_url || getAvatarPlaceholder(40)}
                    alt={block.users?.user_name}
                    className="cq-privacy-settings-blocked-item-avatar"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getAvatarPlaceholder(40);
                    }}
                  />
                  <div className="cq-privacy-settings-blocked-item-details">
                    <div className="cq-privacy-settings-blocked-item-name" style={{ fontWeight: '600', fontSize: '15px' }}>
                      {block.users?.user_name}
                    </div>
                    <div className="cq-privacy-settings-blocked-item-date" style={{ fontSize: '12px', color: '#666' }}>
                      Blocked {new Date(block.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(block.blocked_id)}
                  className="cq-privacy-settings-blocked-item-unblock-button"
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#fff',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc3545';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.color = '#dc3545';
                  }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Account Section */}
      <div
        className="cq-privacy-settings-delete-section"
        style={{
          marginTop: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #f8d7da',
        }}
      >
        <h3 className="cq-privacy-settings-delete-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#dc3545' }}>
          Delete My Account
        </h3>
        <p className="cq-privacy-settings-delete-description" style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          Delete your account. This will remove your content from Crush Quest, including your profile, posts, comments, and likes. You can restore your account later, but you will need to reconnect with friends.
        </p>
        <button
          ref={deleteButtonRef}
          onClick={() => setShowDeleteModal(true)}
          className="cq-privacy-settings-delete-button"
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c82333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc3545';
          }}
        >
          Delete My Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userId={user.id}
          triggerRef={deleteButtonRef}
        />
      )}
        </div>
      </div>
    </div>
  );
}
