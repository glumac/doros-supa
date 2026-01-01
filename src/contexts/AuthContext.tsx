import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { User as SupabaseUser } from "../types/models";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: SupabaseUser | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {},
});

export { AuthContext }; // Export for testing

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from users table
  // Note: We query the `users` table directly (not `public_user_profiles` view) because:
  // 1. The view excludes deleted users (deleted_at IS NOT NULL), but we need to read
  //    deleted_at to detect if the current user's account is soft-deleted
  // 2. RLS allows users to view their own profile row regardless of deleted_at status
  // 3. This enables the restore flow to detect and display the RestoreAccount screen
  const fetchUserProfileById = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data && !error) {
      setUserProfile(data as SupabaseUser);
    } else {
      setUserProfile(null);
    }
  }, []);

  // Exposed function to refresh the current user's profile
  const refreshUserProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserProfileById(user.id);
    }
  }, [user?.id, fetchUserProfileById]);

  useEffect(() => {
    let isInitialLoad = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch user profile if user exists
      if (session?.user) {
        fetchUserProfileById(session.user.id);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
      isInitialLoad = false;
    });

    // Listen for auth changes (including token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle token refresh - update session without re-fetching profile
      if (event === "TOKEN_REFRESHED") {
        setSession(session);
        setUser(session?.user ?? null);
        // Don't re-fetch profile on token refresh, it's still the same user
        return;
      }

      // Skip the initial event since getSession already handled it
      if (isInitialLoad && event === "INITIAL_SESSION") {
        isInitialLoad = false;
        return;
      }

      // Handle all other auth events (SIGNED_IN, SIGNED_OUT, etc.)
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch user profile if user exists
      if (session?.user) {
        fetchUserProfileById(session.user.id);
      } else {
        setUserProfile(null);
      }

      isInitialLoad = false;
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfileById]);

  const value = useMemo(
    () => ({ user, session, userProfile, loading, refreshUserProfile }),
    [user, session, userProfile, loading, refreshUserProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
