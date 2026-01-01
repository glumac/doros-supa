-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set admin user
UPDATE users SET is_admin = true WHERE email = 'mglumac@gmail.com';

-- Create admin stats function (efficient aggregation)
CREATE OR REPLACE FUNCTION get_admin_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_users BIGINT,
  new_users BIGINT,
  total_pomodoros BIGINT,
  completed_pomodoros BIGINT,
  total_likes BIGINT,
  total_comments BIGINT,
  active_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT,
    (SELECT COUNT(*) FROM pomodoros
      WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT,
    (SELECT COUNT(*) FROM pomodoros WHERE completed = true
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT,
    (SELECT COUNT(*) FROM likes
      WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT,
    (SELECT COUNT(*) FROM comments
      WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT,
    (SELECT COUNT(DISTINCT user_id) FROM pomodoros WHERE completed = true
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily pomodoros for charts
CREATE OR REPLACE FUNCTION get_daily_pomodoro_counts(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*)::BIGINT as count
  FROM pomodoros
  WHERE completed = true
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY created_at::DATE
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily new users for charts
CREATE OR REPLACE FUNCTION get_daily_user_signups(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*)::BIGINT as count
  FROM users
  WHERE deleted_at IS NULL
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY created_at::DATE
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
