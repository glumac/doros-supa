// Supabase User type (from users table)
export interface User {
  id: string;
  user_name: string;
  email: string;
  avatar_url: string | null;
  privacy_setting?: string;
  followers_only?: boolean;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Supabase Like type (from likes table with joined user)
export interface Like {
  id: string;
  user_id: string;
  pomodoro_id: string;
  created_at: string;
  users?: User;
}

// Supabase Comment type (from comments table with joined user)
export interface Comment {
  id: string;
  pomodoro_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at?: string;
  users?: User;
}

// Supabase Pomodoro (Doro) type with joined relations
export interface Doro {
  id: string;
  user_id: string;
  launch_at: string;
  task: string;
  notes: string | null;
  completed: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  users?: User;
  likes?: Like[];
  comments?: Comment[];
}

export interface TimerState {
  seconds: number;
  minutes: number;
  isRunning: boolean;
  startTime?: number;
}

// Google OAuth types
export interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

export interface DecodedJWT {
  sub: string;
  name: string;
  picture: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Recently active user for admin dashboard
export interface RecentActiveUser {
  id: string;
  user_name: string;
  avatar_url: string | null;
  last_seen_at: string;
}

// Follow request with joined user data
export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  created_at: string;
  users?: User;
}

// Blocked user relationship with joined user data
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  users?: User;
}

// Follower/following relationship with joined user data
export interface FollowerRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  users?: User;
}

// Chart data point for user statistics
export interface ChartDataPoint {
  startDate?: string;
  endDate?: string;
  count: number;
}
