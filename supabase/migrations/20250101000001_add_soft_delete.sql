-- Add soft delete support for users
-- This migration:
-- 1. Adds deleted_at column to users table
-- 2. Updates public_user_profiles view to exclude deleted users

-- Step 1: Add deleted_at column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Step 2: Update the public_user_profiles view to exclude deleted users
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
FROM users
WHERE deleted_at IS NULL;

-- Step 3: Update RLS policy to exclude deleted users
-- Update the "Authenticated users can view other profiles" policy
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON users;

CREATE POLICY "Authenticated users can view other profiles"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL  -- Must be authenticated (blocks anonymous access)
    AND id != auth.uid()    -- Not viewing own profile (covered by policy above)
    AND deleted_at IS NULL  -- Exclude deleted users
    AND (
      -- Public profiles are visible to all authenticated users
      privacy_setting = 'public'
      OR
      -- Private profiles are only visible to followers
      (
        privacy_setting = 'private'
        AND EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid()
          AND following_id = id
        )
      )
    )
    -- Exclude users who have blocked the current user
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = id
      AND blocked_id = auth.uid()
    )
  );

-- Add comment explaining the view
COMMENT ON VIEW public_user_profiles IS
  'Secure view of user profiles excluding email and deleted users. Use this view for public-facing queries instead of direct table access.';

