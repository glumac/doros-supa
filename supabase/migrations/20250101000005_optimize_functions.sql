-- Optimization migration for soft-delete functions
-- This migration:
-- 1. Adds partial index on users.id for active users
-- 2. Creates active_users view to centralize deleted_at filter
-- 3. Removes redundant DISTINCT in get_suggested_users
-- 4. Adds blocking check to get_public_user_profile
-- 5. Adds LIMIT to intermediate CTEs in get_suggested_users
-- 6. Adds REVOKE/GRANT for security hardening

-- Step 1: Add partial index for faster active user lookups
CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE deleted_at IS NULL;

-- Step 2: Create active_users view (centralized deleted_at filter)
CREATE OR REPLACE VIEW active_users AS
SELECT
  id,
  user_name,
  avatar_url,
  email,
  privacy_setting,
  followers_only,
  created_at,
  updated_at,
  notification_preferences,
  deleted_at
FROM users
WHERE deleted_at IS NULL;

COMMENT ON VIEW active_users IS
  'View of active (non-deleted) users. Use this view instead of users table when filtering for active users only.';

-- Step 3: Update get_suggested_users to remove redundant DISTINCT and add LIMIT to CTEs
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

    -- Users blocked by current user OR users who have blocked current user (bidirectional)
    blocked_users AS (
      -- Users that current user has blocked
      SELECT blocked_id AS user_id
      FROM blocks
      WHERE blocker_id = current_user_id
      UNION
      -- Users who have blocked current user
      SELECT blocker_id AS user_id
      FROM blocks
      WHERE blocked_id = current_user_id
    ),

    -- Mutual followers: users followed by people you follow (exclude deleted)
    -- Limited to top 100 to prevent expensive scans
    mutual_followers AS (
      SELECT
        f2.following_id AS suggested_user_id,
        COUNT(*) * 50 AS score  -- 50 points per mutual connection
      FROM follows f1
      JOIN follows f2 ON f1.following_id = f2.follower_id
      JOIN active_users u2 ON u2.id = f2.following_id
      WHERE f1.follower_id = current_user_id
        AND f2.following_id != current_user_id
        AND f2.following_id NOT IN (SELECT following_id FROM already_following)
        AND f2.following_id NOT IN (SELECT bu.user_id FROM blocked_users bu)
      GROUP BY f2.following_id
      LIMIT 100
    ),

    -- Users who engaged with current user's content (liked or commented) - exclude deleted
    -- Removed redundant DISTINCT (GROUP BY handles uniqueness)
    -- Limited to top 100 to prevent expensive scans
    engaged_with_my_content AS (
      SELECT
        l.user_id AS suggested_user_id,
        COUNT(*) * 10 AS score  -- 10 points per engagement
      FROM pomodoros p
      JOIN likes l ON l.pomodoro_id = p.id
      JOIN active_users lu ON lu.id = l.user_id
      WHERE p.user_id = current_user_id
        AND l.user_id != current_user_id
        AND l.user_id NOT IN (SELECT following_id FROM already_following)
        AND l.user_id NOT IN (SELECT bu.user_id FROM blocked_users bu)
      GROUP BY l.user_id
      LIMIT 100

      UNION ALL

      SELECT
        c.user_id AS suggested_user_id,
        COUNT(*) * 10 AS score
      FROM pomodoros p
      JOIN comments c ON c.pomodoro_id = p.id
      JOIN active_users cu ON cu.id = c.user_id
      WHERE p.user_id = current_user_id
        AND c.user_id != current_user_id
        AND c.user_id NOT IN (SELECT following_id FROM already_following)
        AND c.user_id NOT IN (SELECT bu.user_id FROM blocked_users bu)
      GROUP BY c.user_id
      LIMIT 100
    ),

    -- Active users (recent completions) - exclude deleted
    -- Limited to top 200 to prevent expensive scans
    active_users_cte AS (
      SELECT
        u.id AS suggested_user_id,
        COUNT(p.id) * 5 AS score  -- 5 points per recent completion
      FROM active_users u
      JOIN pomodoros p ON p.user_id = u.id
      WHERE p.completed = true
        AND p.created_at >= NOW() - INTERVAL '7 days'
        AND u.id != current_user_id
        AND u.id NOT IN (SELECT following_id FROM already_following)
        AND u.id NOT IN (SELECT bu.user_id FROM blocked_users bu)
      GROUP BY u.id
      LIMIT 200
    ),

    -- Combine all suggestions with scores
    combined_suggestions AS (
      SELECT suggested_user_id, SUM(score) AS total_score
      FROM (
        SELECT suggested_user_id, score FROM mutual_followers
        UNION ALL
        SELECT suggested_user_id, score FROM engaged_with_my_content
        UNION ALL
        SELECT suggested_user_id, score FROM active_users_cte
      ) AS all_suggestions
      GROUP BY suggested_user_id
    ),

    -- Pre-compute follower counts for result set (avoids correlated subquery per row)
    follower_counts AS (
      SELECT f.following_id, COUNT(*) as cnt
      FROM follows f
      JOIN active_users au ON au.id = f.follower_id
      WHERE f.following_id IN (SELECT suggested_user_id FROM combined_suggestions)
      GROUP BY f.following_id
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
    COALESCE(fc.cnt, 0) AS follower_count,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE pomodoros.user_id = u.id
      AND completed = true
    ) AS completion_count,
    COALESCE(cs.total_score, 0) AS suggestion_score
  FROM active_users u
  LEFT JOIN combined_suggestions cs ON cs.suggested_user_id = u.id
  LEFT JOIN follower_counts fc ON fc.following_id = u.id
  WHERE u.id IN (SELECT suggested_user_id FROM combined_suggestions)
    -- Final check: exclude users who have blocked current user (bidirectional)
    AND u.id NOT IN (SELECT bu.user_id FROM blocked_users bu)
  ORDER BY cs.total_score DESC, u.user_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Step 4: Update get_public_user_profile to add blocking check for consistency
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
    (
      SELECT COUNT(*)
      FROM follows f
      JOIN active_users fu ON fu.id = f.follower_id
      WHERE f.following_id = profile_user_id
    ) as follower_count,
    (
      SELECT COUNT(*)
      FROM follows f
      JOIN active_users fu ON fu.id = f.following_id
      WHERE f.follower_id = profile_user_id
    ) as following_count,
    (SELECT COUNT(*) FROM pomodoros WHERE pomodoros.user_id = profile_user_id AND completed = true) as total_completions,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE pomodoros.user_id = profile_user_id
      AND completed = true
      AND pomodoros.created_at >= (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')
    ) as week_completions,
    (
      profile_user_id = current_user_id OR
      EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = current_user_id
        AND following_id = profile_user_id
      )
    ) as can_view_pomodoros
  FROM active_users u
  WHERE u.id = profile_user_id
    -- Add blocking check for consistency with other RPCs (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = profile_user_id
      AND blocked_id = current_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = current_user_id
      AND blocked_id = profile_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Step 5: Update search_users to use active_users view and optimize follower counts
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
      AND pomodoros.created_at >= (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')
    ) as completion_count
  FROM active_users u
  LEFT JOIN follower_counts fc ON fc.following_id = u.id
  WHERE u.id IN (SELECT id FROM search_results)
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Step 6: Update leaderboard functions to use active_users view
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_current_user_id UUID DEFAULT NULL)
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
  FROM active_users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')
    AND (
      p_current_user_id IS NULL OR
      NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = p_current_user_id
          AND blocked_id = u.id
      )
    )
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
  FROM active_users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')
    AND (
      u.id = p_user_id OR  -- Include self
      u.id IN (SELECT following_id FROM follows WHERE follower_id = p_user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = p_user_id
        AND blocked_id = u.id
    )
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Step 7: Security hardening - revoke default execute and grant only to authenticated
REVOKE EXECUTE ON FUNCTION get_global_leaderboard FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_friends_leaderboard FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION search_users FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_suggested_users FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_public_user_profile FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION soft_delete_account FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION restore_account FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION search_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_suggested_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_account TO authenticated;
GRANT EXECUTE ON FUNCTION restore_account TO authenticated;

-- Update comments
COMMENT ON FUNCTION get_suggested_users IS
  'Returns suggested users based on mutual connections and engagement, excluding deleted users and users in both blocking directions. Uses active_users view and optimized CTEs with limits. Follower counts are pre-computed for efficiency.';

COMMENT ON FUNCTION get_public_user_profile IS
  'Returns user profile information respecting privacy settings. Returns no row for deleted users or when bidirectional blocking exists. Uses active_users view. Follower and following counts exclude deleted users.';

COMMENT ON FUNCTION search_users IS
  'Searches for users by name using active_users view. Excludes users with bidirectional blocking. Follower counts are pre-computed for efficiency.';

COMMENT ON FUNCTION get_global_leaderboard IS
  'Returns global weekly leaderboard using active_users view. Respects blocking.';

COMMENT ON FUNCTION get_friends_leaderboard IS
  'Returns friends weekly leaderboard using active_users view. Respects blocking.';



