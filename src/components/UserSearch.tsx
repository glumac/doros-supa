import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchUsers, useSuggestedUsers } from '../hooks/useUserSearch';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from './FollowButton';
import { getAvatarPlaceholder } from '../utils/avatarPlaceholder';

interface SearchResult {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  is_following: boolean;
  follower_count: number;
  completion_count: number;
}

export default function UserSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Use React Query hooks
  const { data: results = [], isLoading: isSearching, isError: isSearchError } = useSearchUsers(
    debouncedSearchTerm,
    user?.id
  );
  const { data: suggestedUsers = [], isLoading: isLoadingSuggestions } = useSuggestedUsers(
    user?.id,
    15
  );

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const hasSearched = debouncedSearchTerm.length > 0;
  const loading = isSearching || isLoadingSuggestions;

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
    queryClient.invalidateQueries({ queryKey: ['users', 'suggested'] });
  };

  if (!user) {
    return (
      <div className="text-center py-5 text-gray-600">
        Please log in to search for users
      </div>
    );
  }

  return (
    <div className="cq-user-search-container user-search">
      <h2 className="cq-user-search-title mb-5 text-2xl font-semibold">
        🔍 Find Friends
      </h2>

      {/* Search Input */}
      <div className="cq-user-search-input-container mb-5">
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="cq-user-search-input w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300 outline-none transition-colors focus:border-blue-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="cq-user-search-loading text-center py-5 text-gray-600">
          Searching...
        </div>
      )}

      {/* No Results */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="cq-user-search-no-results text-center py-10 text-gray-600">
          <p className="cq-user-search-no-results-message text-lg mb-2.5">
            😕 No users found matching "{debouncedSearchTerm}"
          </p>
          <p className="cq-user-search-no-results-hint">Try a different search term</p>
        </div>
      )}

      {/* Search Results */}
      {!loading && hasSearched && results.length > 0 && (
        <div className="cq-user-search-results search-results">
          <p className="cq-user-search-results-count text-gray-600 mb-4">
            Found {results.length} user{results.length !== 1 ? 's' : ''}
          </p>

          {results.map((result) => (
            <div
              key={result.user_id}
              className="cq-user-search-result-item search-result-item flex items-center p-4 mb-2.5 bg-white rounded-xl shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigate(`/user/${result.user_id}`)}
            >
              {/* Avatar */}
              <img
                src={result.avatar_url || getAvatarPlaceholder(50)}
                alt={result.user_name}
                className="cq-user-search-result-avatar w-12 h-12 rounded-full mr-4 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getAvatarPlaceholder(50);
                }}
              />

              {/* User Info */}
              <div className="cq-user-search-result-info flex-1">
                <div className="cq-user-search-result-name font-semibold text-base mb-1">
                  {result.user_name}
                </div>
                <div className="cq-user-search-result-stats text-gray-600 text-sm">
                  {result.follower_count} follower{result.follower_count !== 1 ? 's' : ''} · {' '}
                  {result.completion_count} pomodoro{result.completion_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Follow Button */}
              <div className="cq-user-search-result-follow-button" onClick={(e) => e.stopPropagation()}>
                <FollowButton
                  userId={result.user_id}
                  initialIsFollowing={result.is_following}
                  onFollowChange={(isFollowing) => handleFollowChange(result.user_id, isFollowing)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initial State - Show Suggested Users */}
      {!loading && !hasSearched && (
        <div className="cq-user-search-suggestions">
          {suggestedUsers.length > 0 ? (
            <>
              <h3 className="cq-user-search-suggestions-title text-lg font-semibold mb-4 text-gray-800">
                ✨ Suggested for you
              </h3>
              <div className="cq-user-search-suggestions-list search-results">
                {suggestedUsers.map((result) => (
                  <div
                    key={result.user_id}
                    className="cq-user-search-suggestion-item search-result-item flex items-center p-4 mb-2.5 bg-white rounded-xl shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => navigate(`/user/${result.user_id}`)}
                  >
                    {/* Avatar */}
                    <img
                      src={result.avatar_url || getAvatarPlaceholder(50)}
                      alt={result.user_name}
                      className="cq-user-search-suggestion-avatar w-12 h-12 rounded-full mr-4 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getAvatarPlaceholder(50);
                      }}
                    />

                    {/* User Info */}
                    <div className="cq-user-search-suggestion-info flex-1">
                      <div className="cq-user-search-suggestion-name font-semibold text-base mb-1">
                        {result.user_name}
                      </div>
                      <div className="cq-user-search-suggestion-stats text-gray-600 text-sm">
                        {result.follower_count} follower{result.follower_count !== 1 ? 's' : ''} · {' '}
                        {result.completion_count} pomodoro{result.completion_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Follow Button */}
                    <div className="cq-user-search-suggestion-follow-button" onClick={(e) => e.stopPropagation()}>
                      <FollowButton
                        userId={result.user_id}
                        initialIsFollowing={result.is_following}
                        onFollowChange={(isFollowing) => handleFollowChange(result.user_id, isFollowing)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cq-user-search-empty-state text-center py-10 text-gray-600">
              <p className="cq-user-search-empty-message text-lg mb-2.5">👋 Start typing to find friends</p>
              <p className="cq-user-search-empty-hint">Search by username to discover new people to follow</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
