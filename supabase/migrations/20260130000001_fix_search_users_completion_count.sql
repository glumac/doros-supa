-- Fix search_users function to count total pomodoros instead of just current week
-- This makes it consistent with get_suggested_users and user profiles

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
  WITH
    search_results AS (
      SELECT u.id
      FROM active_users u
      WHERE u.id != current_user_id
        AND u.user_name ILIKE '%' || search_term || '%'
        -- Filter out users that current user has blocked
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = current_user_id
            AND blocked_id = u.id
        )
        -- Filter out users who have blocked the current user (bidirectional)
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = u.id
            AND blocked_id = current_user_id
        )
      LIMIT 20
    ),
    -- Pre-compute follower counts (avoids correlated subquery per row)
    follower_counts AS (
      SELECT f.following_id, COUNT(*) as cnt
      FROM follows f
      JOIN active_users au ON au.id = f.follower_id
      WHERE f.following_id IN (SELECT id FROM search_results)
      GROUP BY f.following_id
    )
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = u.id
    ) as is_following,
    COALESCE(fc.cnt, 0) as follower_count,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE pomodoros.user_id = u.id
      AND completed = true
    ) as completion_count
  FROM active_users u
  LEFT JOIN follower_counts fc ON fc.following_id = u.id
  WHERE u.id IN (SELECT id FROM search_results)
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION search_users IS
  'Searches users by name with blocking filter. Returns total completed pomodoros count.';
