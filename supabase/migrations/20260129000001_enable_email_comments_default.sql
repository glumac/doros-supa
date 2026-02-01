-- Enable email_comments notification by default
-- This migration updates the default value and backfills existing users

-- Update the default for new users
ALTER TABLE users
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"email_follow_requests": false, "email_likes": false, "email_comments": true}'::jsonb;

-- Update existing users to enable email_comments (only if they haven't customized it)
-- This preserves any custom preferences users may have set
UPDATE users
SET notification_preferences = jsonb_set(
  COALESCE(notification_preferences, '{}'::jsonb),
  '{email_comments}',
  'true'::jsonb
)
WHERE notification_preferences IS NULL
   OR NOT (notification_preferences ? 'email_comments')
   OR (notification_preferences->>'email_comments')::boolean = false;
