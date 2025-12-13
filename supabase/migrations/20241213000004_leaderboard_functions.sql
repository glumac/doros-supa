-- Leaderboard and Discovery Functions
-- Functions for global leaderboard, friends leaderboard, user search, and public profiles

-- Global Leaderboard (all users ranked by weekly completions)
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  completion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    COUNT(p.id) as completion_count
  FROM users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= DATE_TRUNC('week', NOW())
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Friends Leaderboard (followed users only)
CREATE OR REPLACE FUNCTION get_friends_leaderboard(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  completion_count BIGINT,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    COUNT(p.id) as completion_count,
    true as is_following
  FROM users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= DATE_TRUNC('week', NOW())
    AND (
      u.id = p_user_id OR  -- Include self
      u.id IN (SELECT following_id FROM follows WHERE follower_id = p_user_id)
    )
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- User Search (find users by name)
CREATE OR REPLACE FUNCTION search_users(
  search_term TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  is_following BOOLEAN,
  follower_count BIGINT,
  completion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = u.id
    ) as is_following,
    (
      SELECT COUNT(*) FROM follows WHERE following_id = u.id
    ) as follower_count,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE user_id = u.id
      AND completed = true
      AND created_at >= DATE_TRUNC('week', NOW())
    ) as completion_count
  FROM users u
  WHERE u.id != current_user_id
    AND u.user_name ILIKE '%' || search_term || '%'
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Public User Profile (view stats without pomodoros)
CREATE OR REPLACE FUNCTION get_public_user_profile(
  profile_user_id UUID,
  current_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  is_following BOOLEAN,
  follower_count BIGINT,
  following_count BIGINT,
  total_completions BIGINT,
  week_completions BIGINT,
  can_view_pomodoros BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    u.created_at,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = profile_user_id
    ) as is_following,
    (SELECT COUNT(*) FROM follows WHERE following_id = profile_user_id) as follower_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = profile_user_id) as following_count,
    (SELECT COUNT(*) FROM pomodoros WHERE user_id = profile_user_id AND completed = true) as total_completions,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE user_id = profile_user_id
      AND completed = true
      AND created_at >= DATE_TRUNC('week', NOW())
    ) as week_completions,
    (
      profile_user_id = current_user_id OR
      EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = current_user_id
        AND following_id = profile_user_id
      )
    ) as can_view_pomodoros
  FROM users u
  WHERE u.id = profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
