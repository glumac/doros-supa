-- Fix get_suggested_users to show fallback users when no personalized suggestions exist
-- This ensures users always see suggestions, even if they're new or have no connections

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

    -- Users blocked by current user (to exclude)
    blocked_users AS (
      SELECT blocked_id
      FROM blocks
      WHERE blocker_id = current_user_id
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
        AND f2.following_id NOT IN (SELECT blocked_id FROM blocked_users)
      GROUP BY f2.following_id
    ),

    -- Users who engaged with current user's content (liked or commented)
    engaged_with_my_content AS (
      SELECT
        DISTINCT l.user_id AS suggested_user_id,
        COUNT(*) * 10 AS score  -- 10 points per engagement
      FROM pomodoros p
      JOIN likes l ON l.pomodoro_id = p.id
      WHERE p.user_id = current_user_id
        AND l.user_id != current_user_id
        AND l.user_id NOT IN (SELECT following_id FROM already_following)
        AND l.user_id NOT IN (SELECT blocked_id FROM blocked_users)
      GROUP BY l.user_id

      UNION ALL

      SELECT
        DISTINCT c.user_id AS suggested_user_id,
        COUNT(*) * 10 AS score
      FROM pomodoros p
      JOIN comments c ON c.pomodoro_id = p.id
      WHERE p.user_id = current_user_id
        AND c.user_id != current_user_id
        AND c.user_id NOT IN (SELECT following_id FROM already_following)
        AND c.user_id NOT IN (SELECT blocked_id FROM blocked_users)
      GROUP BY c.user_id
    ),

    -- Active users (recent completions)
    active_users AS (
      SELECT
        u.id AS suggested_user_id,
        COUNT(p.id) * 5 AS score  -- 5 points per recent completion
      FROM users u
      JOIN pomodoros p ON p.user_id = u.id
      WHERE p.completed = true
        AND p.created_at >= NOW() - INTERVAL '7 days'
        AND u.id != current_user_id
        AND u.id NOT IN (SELECT following_id FROM already_following)
        AND u.id NOT IN (SELECT blocked_id FROM blocked_users)
      GROUP BY u.id
    ),

    -- Combine all personalized suggestions with scores
    combined_suggestions AS (
      SELECT suggested_user_id, SUM(score) AS total_score
      FROM (
        SELECT suggested_user_id, score FROM mutual_followers
        UNION ALL
        SELECT suggested_user_id, score FROM engaged_with_my_content
        UNION ALL
        SELECT suggested_user_id, score FROM active_users
      ) AS all_suggestions
      GROUP BY suggested_user_id
    ),

    -- Fallback: Popular users when no personalized suggestions exist
    -- Show users with most followers and completions
    fallback_users AS (
      SELECT
        u.id AS suggested_user_id,
        (
          -- Score based on follower count and completion count
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) * 2 +
          (SELECT COUNT(*) FROM pomodoros WHERE user_id = u.id AND completed = true) * 1
        )::NUMERIC AS total_score
      FROM users u
      WHERE u.id != current_user_id
        AND u.id NOT IN (SELECT following_id FROM already_following)
        AND u.id NOT IN (SELECT blocked_id FROM blocked_users)
        AND (
          -- Only include in fallback if they have some activity
          (SELECT COUNT(*) FROM pomodoros p4 WHERE p4.user_id = u.id AND p4.completed = true) > 0
          OR (SELECT COUNT(*) FROM follows WHERE following_id = u.id) > 0
        )
        -- Exclude users already in personalized suggestions
        AND u.id NOT IN (SELECT suggested_user_id FROM combined_suggestions)
    ),

    -- Final suggestions: combine personalized and fallback, prioritizing personalized
    -- Always include fallback to fill up to result_limit
    final_suggestions AS (
      SELECT suggested_user_id, total_score FROM combined_suggestions
      UNION ALL
      SELECT suggested_user_id, total_score FROM fallback_users
    )

  SELECT
    u.id AS user_id,
    u.user_name,
    u.avatar_url,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = u.id
    ) AS is_following,
    (
      SELECT COUNT(*) FROM follows WHERE following_id = u.id
    ) AS follower_count,
    (
      SELECT COUNT(*) FROM pomodoros p2
      WHERE p2.user_id = u.id
      AND p2.completed = true
    ) AS completion_count,
    COALESCE(fs.total_score, 0) AS suggestion_score
  FROM users u
  INNER JOIN final_suggestions fs ON fs.suggested_user_id = u.id
  WHERE u.id NOT IN (SELECT blocked_id FROM blocked_users)
  ORDER BY fs.total_score DESC, u.user_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

