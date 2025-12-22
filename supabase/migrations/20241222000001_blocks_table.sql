-- Blocks Table for User Blocking Functionality
-- This migration adds support for blocking users

-- Create blocks table
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Indexes for performance
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX idx_blocks_both ON blocks(blocker_id, blocked_id);

-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocks

-- Users can view their own blocks (who they blocked)
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can create blocks (block someone)
CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Helper function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  blocker_user_id UUID,
  blocked_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = blocker_user_id
      AND blocked_id = blocked_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;

