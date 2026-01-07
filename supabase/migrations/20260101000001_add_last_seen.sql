-- Add last_seen_at column to users table for tracking recent activity
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;

-- Create admin RPC to get recently active users
-- Returns users ordered by most recent activity, excluding deleted users
CREATE OR REPLACE FUNCTION get_recent_active_users(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  avatar_url TEXT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, user_name, avatar_url, last_seen_at
  FROM users
  WHERE deleted_at IS NULL
    AND last_seen_at IS NOT NULL
  ORDER BY last_seen_at DESC
  LIMIT p_limit;
$$;

-- RPC to update last_seen_at (called from frontend on app load)
-- Uses SECURITY DEFINER to bypass RLS and update the current user's record
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE users
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
$$;
