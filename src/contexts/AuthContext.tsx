import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { User as SupabaseUser } from "../types/models";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: SupabaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
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
  const fetchUserProfile = async (userId: string) => {
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
  };

  useEffect(() => {
    let isInitialLoad = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch user profile if user exists
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
      isInitialLoad = false;
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip the initial event since getSession already handled it
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Fetch user profile if user exists
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ user, session, userProfile, loading }),
    [user, session, userProfile, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
