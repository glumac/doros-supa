-- Update RLS policies to exclude deleted users' content and engagement
-- This migration updates pomodoros, likes, comments, and storage policies to hide deleted users

-- Update pomodoros policy for followed users - exclude deleted users
DROP POLICY IF EXISTS "Users can view followed users' pomodoros" ON pomodoros;

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
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = pomodoros.user_id
      AND users.deleted_at IS NULL  -- Exclude pomodoros from deleted users
    )
  );

-- Update pomodoros policy for public users - exclude deleted users
DROP POLICY IF EXISTS "Users can view public users' pomodoros" ON pomodoros;

CREATE POLICY "Users can view public users' pomodoros"
  ON pomodoros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = pomodoros.user_id
      AND users.followers_only = false
      AND users.deleted_at IS NULL  -- Exclude deleted users
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = pomodoros.user_id
      AND blocked_id = auth.uid()
    )
  );

-- Update likes policy to exclude likes from deleted users
DROP POLICY IF EXISTS "Users can view likes on visible pomodoros" ON likes;

CREATE POLICY "Users can view likes on visible pomodoros"
  ON likes FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros) -- Will respect pomodoro RLS
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = likes.user_id
      AND users.deleted_at IS NULL  -- Exclude likes from deleted users
    )
  );

-- Update comments policy to exclude comments from deleted users
DROP POLICY IF EXISTS "Users can view comments on visible pomodoros" ON comments;

CREATE POLICY "Users can view comments on visible pomodoros"
  ON comments FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros) -- Will respect pomodoro RLS
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = comments.user_id
      AND users.deleted_at IS NULL  -- Exclude comments from deleted users
    )
  );

-- Update storage policy to exclude deleted users' images
DROP POLICY IF EXISTS "Users can read accessible images" ON storage.objects;

CREATE POLICY "Users can read accessible images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pomodoro-images' AND (
      -- Own images
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Followed users' images (with blocking check and deleted check)
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
          AND users.deleted_at IS NULL  -- Exclude deleted users' images
        )
      ) OR
      -- Public users' images (followers_only = false, with blocking check and deleted check)
      (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id::text = (storage.foldername(name))[1]
          AND users.followers_only = false
          AND users.deleted_at IS NULL  -- Exclude deleted users' images
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE blocker_id = (storage.foldername(name))[1]::uuid
          AND blocked_id = auth.uid()
        )
      )
    )
  );

-- Update comments
COMMENT ON POLICY "Users can view followed users' pomodoros" ON pomodoros IS
  'Allows users to view pomodoros from users they follow, but prevents viewing pomodoros from users who have blocked them or from deleted users. This provides bidirectional blocking protection at the database level.';

COMMENT ON POLICY "Users can view public users' pomodoros" ON pomodoros IS
  'Allows authenticated users to see pomodoros from users who have followers_only = false (public by default) and are not deleted. This enables the global feed.';

COMMENT ON POLICY "Users can view likes on visible pomodoros" ON likes IS
  'Allows users to view likes on visible pomodoros, but excludes likes from deleted users.';

COMMENT ON POLICY "Users can view comments on visible pomodoros" ON comments IS
  'Allows users to view comments on visible pomodoros, but excludes comments from deleted users.';

COMMENT ON POLICY "Users can read accessible images" ON storage.objects IS
  'Allows users to read images from: (1) themselves, (2) users they follow (if not blocked and not deleted), and (3) public users (followers_only = false, if not blocked and not deleted). This matches the pomodoros table RLS policies to ensure images are accessible when their corresponding pomodoros are visible.';



