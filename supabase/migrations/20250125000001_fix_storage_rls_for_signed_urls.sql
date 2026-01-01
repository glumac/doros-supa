-- Fix Storage RLS Policy for Signed URLs
-- The issue is that the policy structure was incorrect - validation checks were outside the OR conditions
-- This migration restructures the policy so each case has its own proper validation

-- Drop the existing read policy
DROP POLICY IF EXISTS "Users can read accessible images" ON storage.objects;

-- Create a properly structured policy that ensures signed URLs work correctly
-- Each OR condition is self-contained with its own validation checks
CREATE POLICY "Users can read accessible images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pomodoro-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IS NOT NULL AND
    (
      -- Case 1: Own images (no additional checks needed - user can always see their own images)
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Case 2: Followed users' images (with blocking check and deleted check)
      (
        (storage.foldername(name))[1]::uuid IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = (storage.foldername(name))[1]::uuid
          AND blocked_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id::text = (storage.foldername(name))[1]
          AND users.deleted_at IS NULL
        )
      )
      OR
      -- Case 3: Public users' images (followers_only = false, with blocking check and deleted check)
      (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id::text = (storage.foldername(name))[1]
          AND users.followers_only = false
          AND users.deleted_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = (storage.foldername(name))[1]::uuid
          AND blocked_id = auth.uid()
        )
      )
    )
    -- Requester must exist and not be deleted (applies to all cases)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.deleted_at IS NULL
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can read accessible images" ON storage.objects IS
  'Allows authenticated users to read images from: (1) themselves (always allowed), (2) users they follow (if not blocked and owner not deleted), and (3) public users (followers_only = false, if not blocked and owner not deleted). The requester must also exist and not be deleted. This policy is structured so each case has its own validation checks.';

