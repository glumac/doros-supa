-- Add indexes for engagement-based queries
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Function to get suggested users for a given user
-- Returns personalized recommendations based on:
-- 1. Mutual followers (users followed by people you follow)
-- 2. Engagement signals (users who interacted with your content)
-- 3. Activity level (recent pomodoro completions)
CREATE OR REPLACE FUNCTION get_suggested_users(
  current_user_id UUID,
  result_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  is_following BOOLEAN,
  follower_count BIGINT,
  completion_count BIGINT,
  suggestion_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH
    -- Users already followed by current user (to exclude)
    already_following AS (
      SELECT following_id
      FROM follows
      WHERE follower_id = current_user_id
    ),

    -- Mutual followers: users followed by people you follow
    mutual_followers AS (
      SELECT
        f2.following_id AS suggested_user_id,
        COUNT(*) * 50 AS score  -- 50 points per mutual connection
      FROM follows f1
      JOIN follows f2 ON f1.following_id = f2.follower_id
      WHERE f1.follower_id = current_user_id
        AND f2.following_id != current_user_id
        AND f2.following_id NOT IN (SELECT following_id FROM already_following)
      GROUP BY f2.following_id
    ),

    -- Users who engaged with current user's content (liked or commented)
    engaged_with_my_content AS (
      SELECT
        COALESCE(l.user_id, c.user_id) AS suggested_user_id,
        COUNT(*) * 30 AS score  -- 30 points per engagement
      FROM pomodoros p
      LEFT JOIN likes l ON p.id = l.pomodoro_id
      LEFT JOIN comments c ON p.id = c.pomodoro_id
      WHERE p.user_id = current_user_id
        AND (l.user_id IS NOT NULL OR c.user_id IS NOT NULL)
        AND COALESCE(l.user_id, c.user_id) != current_user_id
        AND COALESCE(l.user_id, c.user_id) NOT IN (SELECT following_id FROM already_following)
      GROUP BY COALESCE(l.user_id, c.user_id)
    ),

    -- Users whose content current user engaged with
    i_engaged_with_content AS (
      SELECT
        p.user_id AS suggested_user_id,
        COUNT(*) * 20 AS score  -- 20 points per engagement
      FROM pomodoros p
      LEFT JOIN likes l ON p.id = l.pomodoro_id AND l.user_id = current_user_id
      LEFT JOIN comments c ON p.id = c.pomodoro_id AND c.user_id = current_user_id
      WHERE (l.user_id IS NOT NULL OR c.user_id IS NOT NULL)
        AND p.user_id != current_user_id
        AND p.user_id NOT IN (SELECT following_id FROM already_following)
      GROUP BY p.user_id
    ),

    -- Active users (completed pomodoros in last 7 days)
    active_users AS (
      SELECT
        p.user_id AS suggested_user_id,
        COUNT(*) * 10 AS score  -- 10 points per recent completion
      FROM pomodoros p
      WHERE p.completed = TRUE
        AND p.created_at >= NOW() - INTERVAL '7 days'
        AND p.user_id != current_user_id
        AND p.user_id NOT IN (SELECT following_id FROM already_following)
      GROUP BY p.user_id
    ),

    -- Combine all suggestion sources with weighted scores
    all_suggestions AS (
      SELECT suggested_user_id, SUM(score) AS total_score
      FROM (
        SELECT suggested_user_id, score FROM mutual_followers
        UNION ALL
        SELECT suggested_user_id, score FROM engaged_with_my_content
        UNION ALL
        SELECT suggested_user_id, score FROM i_engaged_with_content
        UNION ALL
        SELECT suggested_user_id, score FROM active_users
      ) combined
      GROUP BY suggested_user_id
    )

  -- Return user details with calculated scores
  SELECT
    u.id AS user_id,
    u.user_name,
    u.avatar_url,
    FALSE AS is_following,  -- Already excluded followed users
    (
      SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id
    )::BIGINT AS follower_count,
    (
      SELECT COUNT(*) FROM pomodoros p
      WHERE p.user_id = u.id
      AND p.completed = true
    )::BIGINT AS completion_count,
    COALESCE(s.total_score, 0) AS suggestion_score
  FROM users u
  INNER JOIN all_suggestions s ON u.id = s.suggested_user_id
  ORDER BY suggestion_score DESC, follower_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;
