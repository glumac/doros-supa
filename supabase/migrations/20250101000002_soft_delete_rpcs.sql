-- Soft delete account RPCs
-- This migration creates RPCs for soft-deleting and restoring user accounts
-- Soft delete removes social graph (follows, follow_requests) so restore doesn't bring friends back

-- Function to soft delete an account
CREATE OR REPLACE FUNCTION soft_delete_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Guard: only allow users to delete their own account
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Set deleted_at timestamp
  UPDATE users
  SET deleted_at = NOW()
  WHERE id = p_user_id;

  -- Delete social graph so restore doesn't bring friends back
  DELETE FROM follows
  WHERE follower_id = p_user_id OR following_id = p_user_id;

  DELETE FROM follow_requests
  WHERE requester_id = p_user_id OR target_id = p_user_id;

  -- Note: We leave pomodoros, likes, comments, and blocks intact for history/audit
END;
$$;

-- Function to restore an account
CREATE OR REPLACE FUNCTION restore_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Guard: only allow users to restore their own account
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'You can only restore your own account';
  END IF;

  -- Clear deleted_at timestamp
  UPDATE users
  SET deleted_at = NULL
  WHERE id = p_user_id;

  -- Note: We do NOT restore follows/requests - user must re-connect
END;
$$;

-- Add comments
COMMENT ON FUNCTION soft_delete_account IS
  'Soft deletes a user account by setting deleted_at timestamp and removing all follow relationships. Account can be restored later but friends will not be restored.';

COMMENT ON FUNCTION restore_account IS
  'Restores a soft-deleted user account by clearing deleted_at. Follow relationships are NOT restored - user must re-connect with friends.';



