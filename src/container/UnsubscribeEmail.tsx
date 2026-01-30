import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function UnsubscribeEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Missing unsubscribe token');
      return;
    }

    handleUnsubscribe(token);
  }, [searchParams]);

  const handleUnsubscribe = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('unsubscribe-email', {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus('success');
      setMessage(data.message || 'You have been unsubscribed from email notifications');
      setUserName(data.userName || '');
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
      setMessage(
        error.message === 'Invalid or expired token'
          ? 'This unsubscribe link has expired. Please update your preferences in settings.'
          : 'Failed to unsubscribe. Please try again or update your preferences in settings.'
      );
    }
  };

  return (
    <div
      className="cq-unsubscribe-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '20px',
      }}
    >
      <div
        className="cq-unsubscribe-card"
        style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <div
              className="cq-unsubscribe-spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e9ecef',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }}
            />
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Processing...
            </h2>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Updating your notification preferences
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="cq-unsubscribe-success-icon"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#d4edda',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '30px',
                color: '#155724',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
              Unsubscribed Successfully
            </h2>
            {userName && (
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                Hi {userName}!
              </p>
            )}
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              {message}
            </p>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>
              You can manage all your notification preferences in your account settings.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="cq-unsubscribe-settings-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
              }}
            >
              Go to Settings
            </button>
            <button
              onClick={() => navigate('/')}
              className="cq-unsubscribe-home-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#fff',
                color: '#007bff',
                border: '1px solid #007bff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              Go to Home
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="cq-unsubscribe-error-icon"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f8d7da',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '30px',
                color: '#721c24',
              }}
            >
              ✕
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
              Unsubscribe Failed
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="cq-unsubscribe-settings-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
              }}
            >
              Update in Settings
            </button>
            <button
              onClick={() => navigate('/')}
              className="cq-unsubscribe-home-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#fff',
                color: '#007bff',
                border: '1px solid #007bff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              Go to Home
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
