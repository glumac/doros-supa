import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPendingFollowRequestsCount } from '../lib/queries';

export default function FollowRequestsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadRequestCount();

      // Poll every 30 seconds for updates
      const interval = setInterval(loadRequestCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadRequestCount() {
    if (!user) return;
    setLoading(true);
    try {
      const { count } = await getPendingFollowRequestsCount(user.id);
      setRequestCount(count);
    } catch (error) {
      console.error('Error loading follow request count:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't show on create-doro page or if no requests
  if (!user || requestCount === 0 || location.pathname === '/create-doro') {
    return null;
  }

  return (
    <div
      onClick={() => navigate(`/user/${user.id}?tab=requests`)}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#007bff',
        color: '#fff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#0056b3';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#007bff';
      }}
    >
      <span style={{ marginRight: '8px' }}>🔔</span>
      You have {requestCount} pending follow request{requestCount !== 1 ? 's' : ''}
      <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.9 }}>
        → Click to review
      </span>
    </div>
  );
}
