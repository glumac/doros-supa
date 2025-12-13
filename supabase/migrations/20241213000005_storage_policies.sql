-- Storage RLS Policies for pomodoro-images bucket
-- Note: Bucket must be created manually in Supabase dashboard first

-- Users can upload images to their own folder
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pomodoro-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own images and images from users they follow
CREATE POLICY "Users can read accessible images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pomodoro-images' AND (
      -- Own images
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Followed users' images
      (storage.foldername(name))[1] IN (
        SELECT following_id::text FROM follows WHERE follower_id = auth.uid()
      )
    )
  );

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pomodoro-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
