// Supabase User type (from users table)
export interface User {
  id: string;
  user_name: string;
  email: string;
  avatar_url: string | null;
  privacy_setting?: string;
  followers_only?: boolean;
  created_at?: string;
  updated_at?: string;
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
