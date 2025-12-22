import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLeaderboards } from '../contexts/LeaderboardContext';

interface LeaderboardUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  completion_count: number;
  is_following?: boolean;
}

export default function FriendsLeaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friendsLeaderboard, loading } = useLeaderboards();
  const leaderboard = friendsLeaderboard;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        Please log in to see your friends leaderboard
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        Loading friends leaderboard...
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>👥 No friends yet!</p>
        <p style={{ color: '#666' }}>
          Follow other users to see them here and track your progress together.
        </p>
      </div>
    );
  }

  return (
    <div className="cq-friends-leaderboard-container friends-leaderboard">
      <h2 className="cq-friends-leaderboard-title" style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>
        👥 Friends Leaderboard
      </h2>
      <p className="cq-friends-leaderboard-description" style={{ color: '#666', marginBottom: '20px' }}>
        Your accountability circle - people you follow (and yourself)
      </p>

      <div className="cq-friends-leaderboard-list leaderboard-list">
        {leaderboard.map((item, index) => {
          const isCurrentUser = item.user_id === user.id;

          return (
            <div
              key={item.user_id}
              className={`cq-friends-leaderboard-item leaderboard-item ${isCurrentUser ? 'cq-friends-leaderboard-item-current-user' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: isCurrentUser ? '#f0f7ff' : '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: isCurrentUser ? '2px solid #007bff' : 'none'
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
                className="cq-friends-leaderboard-item-rank"
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
                src={item.avatar_url || 'https://via.placeholder.com/50'}
                alt={item.user_name}
                className="cq-friends-leaderboard-item-avatar"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  marginRight: '15px',
                  objectFit: 'cover'
                }}
              />

              {/* User Info */}
              <div className="cq-friends-leaderboard-item-info" style={{ flex: 1 }}>
                <div className="cq-friends-leaderboard-item-name" style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  {item.user_name}
                  {isCurrentUser && (
                    <span className="cq-friends-leaderboard-item-you-badge" style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#007bff',
                      fontWeight: '400'
                    }}>
                      (You)
                    </span>
                  )}
                </div>
                <div className="cq-friends-leaderboard-item-stats" style={{ color: '#666', fontSize: '14px' }}>
                  {item.completion_count} pomodoro{item.completion_count !== 1 ? 's' : ''} this week
                </div>
              </div>

              {/* Status indicator for current user */}
              {isCurrentUser && (
                <div className="cq-friends-leaderboard-item-you-indicator" style={{
                  padding: '4px 12px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  You
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
