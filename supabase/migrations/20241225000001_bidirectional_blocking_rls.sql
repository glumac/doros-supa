-- Bidirectional Blocking RLS Policy Update
-- This migration updates the pomodoros RLS policy to prevent blocked users from viewing blocker's pomodoros

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view followed users' pomodoros" ON pomodoros;

-- Recreate the policy with bidirectional blocking check
CREATE POLICY "Users can view followed users' pomodoros"
  ON pomodoros FOR SELECT
  USING (
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = pomodoros.user_id
      AND blocked_id = auth.uid()
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view followed users' pomodoros" ON pomodoros IS
  'Allows users to view pomodoros from users they follow, but prevents viewing pomodoros from users who have blocked them. This provides bidirectional blocking protection at the database level.';

