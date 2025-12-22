-- Function to approve follow requests
-- Uses SECURITY DEFINER to bypass RLS when creating follow relationships
CREATE OR REPLACE FUNCTION approve_follow_request(
  p_request_id UUID,
  p_approver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_requester_id UUID;
  v_target_id UUID;
  v_follow_id UUID;
BEGIN
  -- Get request details and verify it belongs to the approver
  SELECT requester_id, target_id INTO v_requester_id, v_target_id
  FROM follow_requests
  WHERE id = p_request_id
    AND target_id = p_approver_id
    AND status = 'pending';

  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Request not found or already processed');
  END IF;

  -- Check if follow relationship already exists
  SELECT id INTO v_follow_id
  FROM follows
  WHERE follower_id = v_requester_id
    AND following_id = v_target_id;

  -- Only create follow relationship if it doesn't exist
  IF v_follow_id IS NULL THEN
    INSERT INTO follows (follower_id, following_id)
    VALUES (v_requester_id, v_target_id)
    RETURNING id INTO v_follow_id;
  END IF;

  -- Mark request as approved
  UPDATE follow_requests
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'follow_id', v_follow_id,
    'requester_id', v_requester_id,
    'target_id', v_target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_follow_request(UUID, UUID) TO authenticated;

