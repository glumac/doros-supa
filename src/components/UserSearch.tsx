import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, getSuggestedUsers } from '../lib/queries';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from './FollowButton';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load suggested users on mount
  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user?.id]);

  async function loadSuggestions() {
    if (!user) return;

    const { data, error } = await getSuggestedUsers(user.id, 15);

    if (error) {
      console.error('Error loading suggestions:', error);
    } else if (data) {
      console.log('✅ Suggested users RAW data:', data);
      console.log('✅ First user completion_count:', data[0]?.completion_count);
      console.log('✅ First user full object:', data[0]);
      setSuggestedUsers(data);
    }
  }

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, user?.id]);

  async function performSearch() {
    if (!user || !searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);

    const { data, error } = await searchUsers(searchTerm, user.id);

    if (error) {
      console.error('Error searching users:', error);
    } else if (data) {
      console.log('🔍 Search results RAW data:', data);
      console.log('🔍 First result completion_count:', data[0]?.completion_count);
      console.log('🔍 First result full object:', data[0]);
      setResults(data);
    }

    setLoading(false);
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        Please log in to search for users
      </div>
    );
  }

  return (
    <div className="user-search">
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>
        🔍 Find Friends
      </h2>

      {/* Search Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '12px',
            border: '2px solid #e0e0e0',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#007bff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Searching...
        </div>
      )}

      {/* No Results */}
      {!loading && hasSearched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>😕 No users found matching "{searchTerm}"</p>
          <p>Try a different search term</p>
        </div>
      )}

      {/* Search Results */}
      {!loading && results.length > 0 && (
        <div className="search-results">
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Found {results.length} user{results.length !== 1 ? 's' : ''}
          </p>

          {results.map((result) => (
            <div
              key={result.user_id}
              className="search-result-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => navigate(`/user/${result.user_id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Avatar */}
              <img
                src={result.avatar_url || 'https://via.placeholder.com/50'}
                alt={result.user_name}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  marginRight: '15px',
                  objectFit: 'cover'
                }}
              />

              {/* User Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  {result.user_name}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  {result.follower_count} follower{result.follower_count !== 1 ? 's' : ''} · {' '}
                  {result.completion_count} pomodoro{result.completion_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Follow Button */}
              <div onClick={(e) => e.stopPropagation()}>
                <FollowButton
                  userId={result.user_id}
                  initialIsFollowing={result.is_following}
                  onFollowChange={(isFollowing) => {
                    // Update the search result to reflect new follow state
                    setResults(prev =>
                      prev.map(r =>
                        r.user_id === result.user_id
                          ? { ...r, is_following: isFollowing }
                          : r
                      )
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initial State - Show Suggested Users */}
      {!loading && !hasSearched && (
        <div>
          {suggestedUsers.length > 0 ? (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#333' }}>
                ✨ Suggested for you
              </h3>
              <div className="search-results">
                {suggestedUsers.map((result) => (
                  <div
                    key={result.user_id}
                    className="search-result-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => navigate(`/user/${result.user_id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Avatar */}
                    <img
                      src={result.avatar_url || 'https://via.placeholder.com/50'}
                      alt={result.user_name}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '15px',
                        objectFit: 'cover'
                      }}
                    />

                    {/* User Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                        {result.user_name}
                      </div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {result.follower_count} follower{result.follower_count !== 1 ? 's' : ''} · {' '}
                        {result.completion_count} pomodoro{result.completion_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Follow Button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton
                        userId={result.user_id}
                        onFollowChange={(isFollowing) => {
                          // Update the suggestion to reflect new follow state and refresh
                          setSuggestedUsers(prev =>
                            prev.filter(r => r.user_id !== result.user_id)
                          );
                          // Optionally reload suggestions to get fresh ones
                          if (isFollowing) {
                            loadSuggestions();
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>👋 Start typing to find friends</p>
              <p>Search by username to discover new people to follow</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
