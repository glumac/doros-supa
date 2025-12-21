-- Follow Requests Table for Approval Workflow
-- This migration adds support for follow request approval system

-- Create follow_requests table
CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CONSTRAINT no_self_request CHECK (requester_id != target_id)
);

-- Indexes for performance
CREATE INDEX idx_follow_requests_target ON follow_requests(target_id, status);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id, status);

-- Add notification preferences column to users table (for future use)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_follow_requests": false, "email_likes": false, "email_comments": false}'::jsonb;

-- Enable RLS
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow_requests

-- Users can view their own follow requests (sent or received)
CREATE POLICY "Users can view own follow requests"
  ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Users can create follow requests
CREATE POLICY "Users can create follow requests"
  ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Only target can update requests (approve/reject)
CREATE POLICY "Target can update follow requests"
  ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- Function to get pending follow request count for a user
CREATE OR REPLACE FUNCTION get_pending_follow_requests_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM follow_requests
    WHERE target_id = user_id
      AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_follow_requests_count(UUID) TO authenticated;
