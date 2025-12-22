-- Fix ambiguous column reference in search_users function
-- The user_id column needs to be explicitly qualified in the pomodoros subquery
-- This was causing the function to fail with "column reference 'user_id' is ambiguous"

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
    u.id AS user_id,
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
      SELECT COUNT(*) FROM pomodoros p
      WHERE p.user_id = u.id
      AND p.completed = true
      AND p.created_at >= (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')
    ) as completion_count
  FROM users u
  WHERE u.id != current_user_id
    AND u.user_name ILIKE '%' || search_term || '%'
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = current_user_id
        AND blocked_id = u.id
    )
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

