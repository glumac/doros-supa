-- Database trigger to send email notifications for new comments
-- This migration creates a trigger that calls the Edge Function when a comment is inserted

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create function to notify via Edge Function
CREATE OR REPLACE FUNCTION notify_comment_via_webhook()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  project_url TEXT;
  function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get project URL from environment or use default
  -- Update this with your actual Supabase project URL
  project_url := current_setting('app.settings.supabase_url', true);
  IF project_url IS NULL THEN
    project_url := 'https://gwiwnpawhribxvjfxkiw.supabase.co'; -- Your project URL
  END IF;

  -- Get anon key from environment
  anon_key := current_setting('app.settings.supabase_anon_key', true);
  IF anon_key IS NULL THEN
    -- This should be set via ALTER DATABASE SET or will use service role internally
    anon_key := 'placeholder'; -- Edge Function will use service role internally
  END IF;

  -- Build the Edge Function URL
  function_url := project_url || '/functions/v1/send-comment-notification';

  -- Build payload with comment ID
  payload := jsonb_build_object(
    'comment_id', NEW.id
  );

  -- Make async HTTP POST request to Edge Function
  -- Using pg_background or extensions.http_post
  PERFORM extensions.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the comment insertion
    RAISE WARNING 'Failed to send comment notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on comments table
DROP TRIGGER IF EXISTS on_comment_created ON comments;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_via_webhook();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_comment_via_webhook() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_comment_via_webhook() TO service_role;
