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

      // Listen for custom event to refresh immediately when requests are approved/rejected
      const handleRefresh = () => {
        loadRequestCount();
      };
      window.addEventListener('followRequestUpdated', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('followRequestUpdated', handleRefresh);
      };
    }
  }, [user?.id]);

  async function loadRequestCount() {
    if (!user) return;
    setLoading(true);
    try {
      const { count } = await getPendingFollowRequestsCount(user.id);
      setRequestCount(typeof count === 'number' ? count : 0);
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
      className="cq-follow-requests-banner-container"
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
      <span className="cq-follow-requests-banner-icon" style={{ marginRight: '8px' }}>🔔</span>
      <span className="cq-follow-requests-banner-message">
        You have {requestCount} pending follow request{requestCount !== 1 ? 's' : ''}
      </span>
      <span className="cq-follow-requests-banner-hint" style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.9 }}>
        → Click to review
      </span>
    </div>
  );
}
