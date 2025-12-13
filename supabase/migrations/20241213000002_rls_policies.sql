-- Row-Level Security (RLS) Policies
-- Implements privacy model: users can only see pomodoros from people they follow (and their own)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoros ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Pomodoros table policies
CREATE POLICY "Users can view own pomodoros"
  ON pomodoros FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view followed users' pomodoros"
  ON pomodoros FOR SELECT
  USING (
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own pomodoros"
  ON pomodoros FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pomodoros"
  ON pomodoros FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own pomodoros"
  ON pomodoros FOR DELETE
  USING (user_id = auth.uid());

-- Likes table policies
CREATE POLICY "Users can view likes on visible pomodoros"
  ON likes FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros) -- Will respect pomodoro RLS
  );

CREATE POLICY "Users can insert own likes"
  ON likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (user_id = auth.uid());

-- Comments table policies
CREATE POLICY "Users can view comments on visible pomodoros"
  ON comments FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros)
  );

CREATE POLICY "Users can insert own comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Follows table policies
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (follower_id = auth.uid());
