-- Rename require_follow_approval to followers_only and enable global feed
-- This migration:
-- 1. Renames the column for clarity
-- 2. Sets default to false (public by default)
-- 3. Updates NULL values to false
-- 4. Updates the public_user_profiles view
-- 5. Adds RLS policy for global feed

-- Step 1: Rename column
ALTER TABLE users
RENAME COLUMN require_follow_approval TO followers_only;

-- Step 2: Ensure default is false (public by default)
ALTER TABLE users
ALTER COLUMN followers_only SET DEFAULT false;

-- Step 3: Update any NULL values to false (public)
UPDATE users
SET followers_only = false
WHERE followers_only IS NULL;

-- Step 4: Update the public_user_profiles view
CREATE OR REPLACE VIEW public_user_profiles AS
SELECT
  id,
  user_name,
  avatar_url,
  privacy_setting,
  followers_only,
  created_at,
  updated_at,
  notification_preferences
FROM users;

-- Step 5: Add RLS policy for global feed
-- Allow viewing pomodoros from public users (followers_only = false)
-- All pomodoros are public by default unless user has followers_only = true
CREATE POLICY "Users can view public users' pomodoros"
  ON pomodoros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = pomodoros.user_id
      AND users.followers_only = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = pomodoros.user_id
      AND blocked_id = auth.uid()
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view public users' pomodoros" ON pomodoros IS
  'Allows authenticated users to see pomodoros from users who have followers_only = false (public by default). This enables the global feed. Users with followers_only = true are excluded from global feed but can still be seen by approved followers.';

