export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          pomodoro_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          pomodoro_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          pomodoro_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_pomodoro_id_fkey"
            columns: ["pomodoro_id"]
            isOneToOne: false
            referencedRelation: "pomodoros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string | null
          id: string
          requester_id: string
          status: string | null
          target_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string | null
          target_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string | null
          target_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          pomodoro_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pomodoro_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pomodoro_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_pomodoro_id_fkey"
            columns: ["pomodoro_id"]
            isOneToOne: false
            referencedRelation: "pomodoros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoros: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          image_url: string | null
          launch_at: string
          notes: string | null
          task: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          launch_at: string
          notes?: string | null
          task: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          launch_at?: string
          notes?: string | null
          task?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pomodoros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pomodoros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          followers_only: boolean | null
          id: string
          is_admin: boolean | null
          last_seen_at: string | null
          notification_preferences: Json | null
          privacy_setting: string | null
          updated_at: string | null
          user_name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          followers_only?: boolean | null
          id: string
          is_admin?: boolean | null
          last_seen_at?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          followers_only?: boolean | null
          id?: string
          is_admin?: boolean | null
          last_seen_at?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          followers_only: boolean | null
          id: string | null
          notification_preferences: Json | null
          privacy_setting: string | null
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          followers_only?: boolean | null
          id?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          followers_only?: boolean | null
          id?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      public_user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          followers_only: boolean | null
          id: string | null
          notification_preferences: Json | null
          privacy_setting: string | null
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          followers_only?: boolean | null
          id?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          followers_only?: boolean | null
          id?: string | null
          notification_preferences?: Json | null
          privacy_setting?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_follow_request: {
        Args: { p_approver_id: string; p_request_id: string }
        Returns: Json
      }
      get_admin_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          active_users: number
          completed_pomodoros: number
          new_users: number
          total_comments: number
          total_likes: number
          total_pomodoros: number
          total_users: number
        }[]
      }
      get_comment_for_notification: {
        Args: { p_comment_id: string }
        Returns: {
          comment_id: string
          comment_text: string
          commenter_avatar: string
          commenter_id: string
          commenter_name: string
          notification_preferences: Json
          owner_email: string
          owner_id: string
          owner_name: string
          pomodoro_id: string
          task: string
        }[]
      }
      get_daily_pomodoro_counts: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_daily_user_signups: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_friends_leaderboard: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          completion_count: number
          is_following: boolean
          user_id: string
          user_name: string
        }[]
      }
      get_global_leaderboard: {
        Args: { p_current_user_id?: string }
        Returns: {
          avatar_url: string
          completion_count: number
          user_id: string
          user_name: string
        }[]
      }
      get_pending_follow_requests_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_public_user_profile: {
        Args: { current_user_id: string; profile_user_id: string }
        Returns: {
          avatar_url: string
          can_view_pomodoros: boolean
          created_at: string
          follower_count: number
          following_count: number
          is_following: boolean
          total_completions: number
          user_id: string
          user_name: string
          week_completions: number
        }[]
      }
      get_recent_active_users: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          id: string
          last_seen_at: string
          user_name: string
        }[]
      }
      get_suggested_users: {
        Args: { current_user_id: string; result_limit?: number }
        Returns: {
          avatar_url: string
          completion_count: number
          follower_count: number
          is_following: boolean
          suggestion_score: number
          user_id: string
          user_name: string
        }[]
      }
      get_user_daily_completions: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_user_monthly_completions: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          count: number
          month_start: string
        }[]
      }
      get_user_stats: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          active_days: number
          completed_pomodoros: number
          total_days: number
          total_pomodoros: number
        }[]
      }
      get_user_weekly_completions: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          count: number
          week_start: string
        }[]
      }
      initialize_name: { Args: { full_name: string }; Returns: string }
      is_user_blocked: {
        Args: { blocked_user_id: string; blocker_user_id: string }
        Returns: boolean
      }
      restore_account: { Args: { p_user_id: string }; Returns: undefined }
      search_users: {
        Args: { current_user_id: string; search_term: string }
        Returns: {
          avatar_url: string
          completion_count: number
          follower_count: number
          is_following: boolean
          user_id: string
          user_name: string
        }[]
      }
      soft_delete_account: { Args: { p_user_id: string }; Returns: undefined }
      update_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
