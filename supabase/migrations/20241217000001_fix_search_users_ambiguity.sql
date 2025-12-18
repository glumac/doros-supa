-- Fix ambiguous column reference in search_users function
-- The user_id column needs to be explicitly qualified as p.user_id

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
      SELECT 1 FROM follows f
      WHERE f.follower_id = current_user_id
      AND f.following_id = u.id
    ) AS is_following,
    (
      SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id
    ) AS follower_count,
    (
      SELECT COUNT(*) FROM pomodoros p
      WHERE p.user_id = u.id
      AND p.completed = true
    ) AS completion_count
  FROM users u
  WHERE u.id != current_user_id
    AND u.user_name ILIKE '%' || search_term || '%'
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
