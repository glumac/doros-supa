import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProfileTabsProps {
  userId: string;
}

export function ProfileTabs({ userId }: ProfileTabsProps) {
  const { userProfile } = useAuth();
  const location = useLocation();

  // Only show tabs when viewing your own profile
  if (!userProfile || userProfile.id !== userId) {
    return null;
  }

  const isPomodoros = location.pathname.startsWith('/user/');
  const isStats = location.pathname === '/stats';

  return (
    <div className="cq-profile-tabs border-b border-gray-200 mb-6">
      <nav className="flex gap-8" aria-label="Profile sections">
        <Link
          to={`/user/${userId}`}
          className={`
            cq-profile-tab-pomodoros
            pb-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${isPomodoros
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
          aria-current={isPomodoros ? 'page' : undefined}
        >
          My Pomodoros
        </Link>
        <Link
          to="/stats"
          className={`
            cq-profile-tab-stats
            pb-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${isStats
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
          aria-current={isStats ? 'page' : undefined}
        >
          My Stats
        </Link>
      </nav>
    </div>
  );
}
