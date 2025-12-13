-- Initial schema for Crush Quest (Doros) migration to Supabase
-- Creates core tables: users, pomodoros, likes, comments, follows

-- Users table (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'private')),
  require_follow_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pomodoros (main content)
CREATE TABLE pomodoros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  launch_at TIMESTAMPTZ NOT NULL,
  task TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pomodoro_id UUID NOT NULL REFERENCES pomodoros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pomodoro_id, user_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pomodoro_id UUID NOT NULL REFERENCES pomodoros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Following/Friends system
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for Performance
CREATE INDEX idx_pomodoros_user_id ON pomodoros(user_id);
CREATE INDEX idx_pomodoros_completed ON pomodoros(completed);
CREATE INDEX idx_pomodoros_created_at ON pomodoros(created_at DESC);
CREATE INDEX idx_likes_pomodoro_id ON likes(pomodoro_id);
CREATE INDEX idx_comments_pomodoro_id ON comments(pomodoro_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Composite index for feed queries
CREATE INDEX idx_pomodoros_completed_created ON pomodoros(completed, created_at DESC);

-- Text search on task/notes
CREATE INDEX idx_pomodoros_task_search ON pomodoros USING gin(to_tsvector('english', task));
CREATE INDEX idx_pomodoros_notes_search ON pomodoros USING gin(to_tsvector('english', notes));
