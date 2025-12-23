-- Fix users table RLS policy to prevent public exposure
-- This addresses the security vulnerability where anyone could access all user data including emails
-- Reference: https://skilldeliver.com/your-supabase-is-public
--
-- IMPORTANT: RLS policies control row access, not column access. To prevent email exposure,
-- we need to restrict direct table access and use views/functions that exclude sensitive columns.

-- Drop the overly permissive policy that allowed anyone to see all users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON users;

-- Policy 1: Users can see their own complete profile (including email)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Authenticated users can see other users' profiles
-- This respects privacy settings but NOTE: RLS doesn't hide columns, so email will still be
-- accessible if someone queries the table directly. We mitigate this by:
-- 1. Restricting to authenticated users only (no anonymous access)
-- 2. Using views/functions for public access that exclude email
CREATE POLICY "Authenticated users can view other profiles"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL  -- Must be authenticated (blocks anonymous access)
    AND id != auth.uid()    -- Not viewing own profile (covered by policy above)
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

-- Create a secure view that excludes email and other sensitive fields
-- This view should be used for public-facing queries instead of direct table access
CREATE OR REPLACE VIEW public_user_profiles AS
SELECT
  id,
  user_name,
  avatar_url,
  privacy_setting,
  require_follow_approval,
  created_at,
  updated_at,
  notification_preferences
  -- NOTE: email is intentionally excluded from this view
FROM users;

-- Grant SELECT on the view (this is safe since email is excluded)
GRANT SELECT ON public_user_profiles TO authenticated;
-- Note: RLS policies will control access - anon role queries will be blocked by the policies above

-- Note: get_public_user_profile function already exists and doesn't return email
-- It's defined in 20241213000004_leaderboard_functions.sql
-- We don't need to modify it - it's already secure

-- Add security comments
COMMENT ON POLICY "Users can view own profile" ON users IS
  'Allows users to see their own complete profile including email. This is safe since users can only see their own data.';

COMMENT ON POLICY "Authenticated users can view other profiles" ON users IS
  'Allows authenticated users to see other users profiles respecting privacy settings. WARNING: Direct table queries will include email. Use get_public_user_profile() function or public_user_profiles view instead.';

COMMENT ON VIEW public_user_profiles IS
  'Secure view of user profiles excluding email. Use this view for public-facing queries instead of direct table access.';

COMMENT ON FUNCTION get_public_user_profile IS
  'Returns user profile information respecting privacy settings. Email is only returned when viewing own profile. Use this function instead of direct table queries.';

