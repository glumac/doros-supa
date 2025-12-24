-- Update Storage RLS Policies to Match Pomodoros Table Policies
-- This migration updates the storage policies to allow:
-- 1. Own images
-- 2. Followed users' images (with blocking check)
-- 3. Public users' images (followers_only = false, with blocking check)
-- This ensures images are accessible when their corresponding pomodoros are visible

-- Drop the existing read policy
DROP POLICY IF EXISTS "Users can read accessible images" ON storage.objects;

-- Create new policy that matches pomodoros RLS policies
CREATE POLICY "Users can read accessible images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pomodoro-images' AND (
      -- Own images
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Followed users' images (with blocking check)
      (
        (storage.foldername(name))[1]::uuid IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = (storage.foldername(name))[1]::uuid
          AND blocked_id = auth.uid()
        )
      ) OR
      -- Public users' images (followers_only = false, with blocking check)
      (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id::text = (storage.foldername(name))[1]
          AND users.followers_only = false
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = (storage.foldername(name))[1]::uuid
          AND blocked_id = auth.uid()
        )
      )
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can read accessible images" ON storage.objects IS
  'Allows users to read images from: (1) themselves, (2) users they follow (if not blocked), and (3) public users (followers_only = false, if not blocked). This matches the pomodoros table RLS policies to ensure images are accessible when their corresponding pomodoros are visible.';

