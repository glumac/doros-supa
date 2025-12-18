import { useState } from 'react';
import GlobalLeaderboard from './GlobalLeaderboard';
import FriendsLeaderboard from './FriendsLeaderboard';

export default function LeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<'friends' | 'global'>('friends');

  return (
    <div className="leaderboard-tabs" style={{ width: '100%' }}>
      {/* Tab Headers */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e0e0e0',
          marginBottom: '24px'
        }}
      >
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'friends' ? '#007bff' : '#666',
            borderBottom: activeTab === 'friends' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          👥 Friends
        </button>
        <button
          onClick={() => setActiveTab('global')}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'global' ? '#007bff' : '#666',
            borderBottom: activeTab === 'global' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          🌍 Global
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'friends' && <FriendsLeaderboard />}
        {activeTab === 'global' && <GlobalLeaderboard />}
      </div>
    </div>
  );
}
