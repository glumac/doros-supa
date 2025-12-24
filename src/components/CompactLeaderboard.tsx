import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useGlobalLeaderboard, useFriendsLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read feed type from URL param, default to 'global'
  const feedType = searchParams.get('feed') || 'global';
  const activeTab = feedType === 'global' ? 'global' : 'friends';

  const handleTabChange = (tab: 'friends' | 'global') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('feed', tab === 'friends' ? 'following' : 'global');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  // Use React Query hooks for real-time updates
  const { data: globalLeaderboard = [], isLoading: globalLoading } = useGlobalLeaderboard(user?.id);
  const { data: friendsLeaderboard = [], isLoading: friendsLoading } = useFriendsLeaderboard(user?.id);

  const loading = activeTab === 'global' ? globalLoading : friendsLoading;

  const handleCloseSidebar = () => {
    if (closeToggle) closeToggle(false);
  };

  const displayData = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;

  return (
    <div className="cq-compact-leaderboard-container">
      {/* Tab Headers */}
      <div className="cq-compact-leaderboard-tabs flex gap-1 px-3 mb-2">
        <button
          onClick={() => handleTabChange('global')}
          className={`cq-compact-leaderboard-tab cq-compact-leaderboard-tab-global flex-1 text-xs py-1 px-2 rounded transition-all ${
            activeTab === 'global'
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Global
        </button>
        <button
          onClick={() => handleTabChange('friends')}
          className={`cq-compact-leaderboard-tab cq-compact-leaderboard-tab-friends flex-1 text-xs py-1 px-2 rounded transition-all ${
            activeTab === 'friends'
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Friends
        </button>
      </div>

      {/* Leaderboard List */}
      <div className="cq-compact-leaderboard-list">
        {loading ? (
          <div className="cq-compact-leaderboard-loading text-xs text-center py-2 text-gray-500">
            Loading...
          </div>
        ) : displayData.length === 0 ? (
          <div className="cq-compact-leaderboard-empty text-xs text-center border-2 border-green-200 mx-3 p-2">
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
              to={`/user/${leader.user_id}`}
              key={leader.user_id}
              onClick={handleCloseSidebar}
              className="cq-compact-leaderboard-item flex gap-2 px-2 py-1 font-bold items-center mx-3 text-green-700 hover:text-green-800 transition-all duration-200 ease-in-out"
            >
              <img
                src={leader.avatar_url || getAvatarPlaceholder(32)}
                className="cq-compact-leaderboard-item-avatar w-8 h-8 rounded-full basis-3"
                alt="user-profile"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getAvatarPlaceholder(32);
                }}
              />
              <div className="cq-compact-leaderboard-item-info flex justify-between basis-full">
                <p className="cq-compact-leaderboard-item-name text-sm">{leader.user_name}</p>
                <p className="cq-compact-leaderboard-item-count font-medium text-slate-800 text-sm">
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
