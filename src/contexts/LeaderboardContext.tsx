import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getGlobalLeaderboard, getFriendsLeaderboard } from "../lib/queries";
import { useAuth } from "./AuthContext";

interface LeaderboardUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  completion_count: number;
}

interface LeaderboardContextType {
  globalLeaderboard: LeaderboardUser[];
  friendsLeaderboard: LeaderboardUser[];
  loading: boolean;
  refreshLeaderboards: () => Promise<void>;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(
  undefined
);

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>(
    []
  );
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<
    LeaderboardUser[]
  >([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const hasDataRef = useRef(false);

  const refreshLeaderboards = useCallback(async () => {
    const currentUserId = user?.id;

    // Prevent duplicate calls - check if already fetching
    if (isFetchingRef.current) {
      return;
    }

    // If same user ID and we already have data, skip fetch
    if (currentUserId === lastUserIdRef.current && hasDataRef.current) {
      return;
    }

    // Set flags BEFORE async operation to prevent race conditions
    isFetchingRef.current = true;
    lastUserIdRef.current = currentUserId;
    hasDataRef.current = false;
    setLoading(true);

    try {
      // Fetch both in parallel
      const [globalResult, friendsResult] = await Promise.all([
        getGlobalLeaderboard(currentUserId),
        currentUserId
          ? getFriendsLeaderboard(currentUserId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (globalResult.data) {
        setGlobalLeaderboard(globalResult.data);
        hasDataRef.current = true;
      }
      if (friendsResult.data) {
        setFriendsLeaderboard(friendsResult.data);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    // Only depend on user?.id, not refreshLeaderboards, to prevent duplicate calls
    // The guard in refreshLeaderboards will prevent duplicate fetches
    const currentUserId = user?.id;

    if (currentUserId === undefined) {
      // No user, clear data
      setGlobalLeaderboard([]);
      setFriendsLeaderboard([]);
      setLoading(false);
      lastUserIdRef.current = undefined;
      hasDataRef.current = false;
      isFetchingRef.current = false; // Reset fetching flag
      return;
    }

    // If same user and we already have data, skip
    if (currentUserId === lastUserIdRef.current && hasDataRef.current) {
      return;
    }

    // If already fetching for this user, skip
    if (isFetchingRef.current && currentUserId === lastUserIdRef.current) {
      return;
    }

    // Reset data flag when user changes to ensure we fetch fresh data
    if (currentUserId !== lastUserIdRef.current) {
      hasDataRef.current = false;
      isFetchingRef.current = false; // Reset fetching flag when user changes
    }

    refreshLeaderboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <LeaderboardContext.Provider
      value={{
        globalLeaderboard,
        friendsLeaderboard,
        loading,
        refreshLeaderboards,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboards() {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error("useLeaderboards must be used within LeaderboardProvider");
  }
  return context;
}

