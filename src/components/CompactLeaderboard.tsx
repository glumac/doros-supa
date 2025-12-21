import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFriendsLeaderboard, getGlobalLeaderboard } from '../lib/queries';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  completion_count: number;
}

interface CompactLeaderboardProps {
  closeToggle?: (value: boolean) => void;
}

export default function CompactLeaderboard({ closeToggle }: CompactLeaderboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'global'>('global');
  const [friendsData, setFriendsData] = useState<LeaderboardUser[]>([]);
  const [globalData, setGlobalData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  async function loadData() {
    setLoading(true);
    
    if (activeTab === 'friends' && user) {
      const { data, error } = await getFriendsLeaderboard(user.id);
      if (data && !error) {
        setFriendsData(data);
      }
    } else if (activeTab === 'global') {
      const { data, error } = await getGlobalLeaderboard();
      if (data && !error) {
        setGlobalData(data);
      }
    }
    
    setLoading(false);
  }

  const handleCloseSidebar = () => {
    if (closeToggle) closeToggle(false);
  };

  const displayData = activeTab === 'friends' ? friendsData : globalData;

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex gap-1 px-3 mb-2">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 text-xs py-1 px-2 rounded transition-all ${
            activeTab === 'global'
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Global
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 text-xs py-1 px-2 rounded transition-all ${
            activeTab === 'friends'
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Friends
        </button>
      </div>

      {/* Leaderboard List */}
      <div>
        {loading ? (
          <div className="text-xs text-center py-2 text-gray-500">
            Loading...
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-xs text-center border-2 border-green-200 mx-3 p-2">
            {activeTab === 'friends' ? (
              <>
                No friends yet!
                <br />
                Follow users to see them here
              </>
            ) : (
              <>
                Fresh week!
                <br />
                Be the first to start a doro!
              </>
            )}
          </div>
        ) : (
          displayData.slice(0, 10).map((leader) => (
            <Link
              to={`user/${leader.user_id}`}
              key={leader.user_id}
              onClick={handleCloseSidebar}
              className="flex gap-2 px-2 py-1 font-bold items-center mx-3 text-green-700 hover:text-green-800 transition-all duration-200 ease-in-out"
            >
              <img
                src={leader.avatar_url || 'https://via.placeholder.com/32'}
                className="w-8 h-8 rounded-full basis-3"
                alt="user-profile"
              />
              <div className="flex justify-between basis-full">
                <p className="text-sm">{leader.user_name}</p>
                <p className="font-medium text-slate-800 text-sm">
                  {leader.completion_count}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
