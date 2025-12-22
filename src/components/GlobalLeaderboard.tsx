import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';
import { useLeaderboards } from '../contexts/LeaderboardContext';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';

interface LeaderboardUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  completion_count: number;
}

export default function GlobalLeaderboard() {
  const navigate = useNavigate();
  const { globalLeaderboard, loading } = useLeaderboards();
  const leaderboard = globalLeaderboard;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        Loading global leaderboard...
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        No users found this week
      </div>
    );
  }

  return (
    <div className="cq-global-leaderboard-container global-leaderboard">
      <h2 className="cq-global-leaderboard-title" style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>
        🌍 Global Leaderboard
      </h2>
      <p className="cq-global-leaderboard-description" style={{ color: '#666', marginBottom: '20px' }}>
        Top performers this week - discover new users to follow!
      </p>

      <div className="cq-global-leaderboard-list leaderboard-list">
        {leaderboard.map((item, index) => (
          <div
            key={item.user_id}
            className="cq-global-leaderboard-item leaderboard-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onClick={() => navigate(`/user/${item.user_id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            {/* Rank */}
            <div
              className="cq-global-leaderboard-item-rank"
              style={{
                minWidth: '40px',
                fontSize: '18px',
                fontWeight: '700',
                color: index < 3 ? '#ffd700' : '#999',
                marginRight: '15px'
              }}
            >
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && `#${index + 1}`}
            </div>

            {/* Avatar */}
            <img
              src={item.avatar_url || getAvatarPlaceholder(50)}
              alt={item.user_name}
              className="cq-global-leaderboard-item-avatar"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                marginRight: '15px',
                objectFit: 'cover'
              }}
            />

            {/* User Info */}
            <div className="cq-global-leaderboard-item-info" style={{ flex: 1 }}>
              <div className="cq-global-leaderboard-item-name" style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                {item.user_name}
              </div>
              <div className="cq-global-leaderboard-item-stats" style={{ color: '#666', fontSize: '14px' }}>
                {item.completion_count} pomodoro{item.completion_count !== 1 ? 's' : ''} this week
              </div>
            </div>

            {/* Follow Button */}
            <div className="cq-global-leaderboard-item-follow-button" onClick={(e) => e.stopPropagation()}>
              <FollowButton
                userId={item.user_id}
                onFollowChange={() => {
                  // Optionally refresh leaderboard or update UI
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
