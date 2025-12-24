import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getBlockedUsers, unblockUser } from '../lib/queries';
import { supabase } from '../lib/supabaseClient';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';

export default function PrivacySettings() {
  const { user } = useAuth();
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadBlockedUsers();
    }
  }, [user?.id]);

  async function loadSettings() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getUserProfile(user.id);
      if (data) {
        setRequireApproval(data.followers_only || false);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBlockedUsers() {
    if (!user) return;
    setLoadingBlocks(true);
    try {
      const { data, error } = await getBlockedUsers(user.id);
      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoadingBlocks(false);
    }
  }

  async function handleToggle() {
    if (!user) return;
    setSaving(true);
    setMessage('');

    try {
      const newValue = !requireApproval;
      const { error } = await supabase
        .from('users')
        .update({ followers_only: newValue })
        .eq('id', user.id);

      if (error) throw error;

      setRequireApproval(newValue);
      setMessage('Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setMessage('Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnblock(blockedId: string) {
    if (!user) return;
    try {
      const { error } = await unblockUser(user.id, blockedId);
      if (error) throw error;
      await loadBlockedUsers();
      setMessage('User unblocked successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error unblocking user:', error);
      setMessage('Failed to unblock user');
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Please log in to access privacy settings
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="cq-privacy-settings-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 className="cq-privacy-settings-title" style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        Privacy Settings
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
            {blockedUsers.map((block) => (
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
    </div>
  );
}
