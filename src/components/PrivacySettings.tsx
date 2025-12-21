import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../lib/queries';
import { supabase } from '../lib/supabaseClient';

export default function PrivacySettings() {
  const { user } = useAuth();
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  async function loadSettings() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getUserProfile(user.id);
      if (data) {
        setRequireApproval(data.require_follow_approval || false);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
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
        .update({ require_follow_approval: newValue })
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        Privacy Settings
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Manage who can follow you and see your content
      </p>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Require Follow Approval
            </h3>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              When enabled, users must send a follow request before they can follow you.
              You'll be able to approve or decline each request. When disabled, anyone
              can follow you instantly.
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={saving}
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

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <p style={{ margin: 0, lineHeight: '1.6' }}>
          <strong>Note:</strong> This setting only controls who can follow you. Your profile
          visibility and content sharing preferences can be managed separately in the future.
          Existing followers will not be affected by changes to this setting.
        </p>
      </div>
    </div>
  );
}
