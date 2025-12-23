# Codebase Violations Report - agents.md Conventions

**Generated:** Analysis of codebase against `agents.md` conventions

---

## 🔴 Critical Violations

### 1. UserSearch.tsx - Manual Data Fetching (React Query Violation)

**File:** `src/components/UserSearch.tsx`

**Violations:**

- ❌ Uses `useState` + `useEffect` for data fetching instead of React Query hooks
- ❌ Direct calls to `searchUsers()` and `getSuggestedUsers()` in component
- ❌ Manual loading state management
- ❌ No automatic cache invalidation
- ❌ **107 inline styles** (violates Tailwind-only rule)

**Current Code:**

```typescript
const [results, setResults] = useState<SearchResult[]>([]);
const [suggestedUsers, setSuggestedUsers] = useState<SearchResult[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (user) {
    loadSuggestions();
  }
}, [user?.id]);

async function loadSuggestions() {
  const result = await getSuggestedUsers(user.id, 15);
  // Manual state management...
}
```

**Required Fix:**

- Create hooks: `useSearchUsers(searchTerm, currentUserId)` and `useSuggestedUsers(userId, limit)`
- Replace all `useState`/`useEffect` patterns with React Query hooks
- Remove inline styles, use Tailwind classes only

**Missing Hooks Needed:**

```typescript
// src/hooks/useUserSearch.ts (NEW FILE)
export function useSearchUsers(searchTerm: string, currentUserId: string) {
  return useQuery({
    queryKey: ["users", "search", searchTerm, currentUserId],
    queryFn: async () => {
      const { data, error } = await searchUsers(searchTerm, currentUserId);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length > 0 && !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSuggestedUsers(userId: string | undefined, limit = 15) {
  return useQuery({
    queryKey: ["users", "suggested", userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const { data, error } = await getSuggestedUsers(userId, limit);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

---

### 2. UserProfile.tsx - Manual Data Fetching (React Query Violation)

**File:** `src/components/UserProfile.tsx`

**Violations:**

- ❌ Uses `useState` + `useEffect` for `getUserProfile()`
- ❌ Uses `useState` + `useEffect` for `getFollowers()` and `getFollowing()`
- ❌ Uses `useState` + `useEffect` for `getPendingFollowRequests()`
- ❌ Manual loading state management
- ❌ No automatic cache invalidation
- ✅ **Correctly uses** `useUserPomodoros()` hook

**Current Code:**

```typescript
const [user, setUser] = useState<User>();
const [followerCount, setFollowerCount] = useState<number>(0);
const [followingCount, setFollowingCount] = useState<number>(0);
const [followRequests, setFollowRequests] = useState<any[]>([]);

useEffect(() => {
  getUserProfile(userId).then(({ data, error }) => {
    if (data && !error) {
      setUser(data as User);
    }
  });
  getFollowers(userId).then(({ data }) => {
    setFollowerCount(data?.length || 0);
  });
  // ... more manual fetching
}, [userId]);
```

**Required Fix:**

- Use existing `useUserProfile(userId)` hook (already exists!)
- Create hooks: `useFollowers(userId)`, `useFollowing(userId)`, `usePendingFollowRequests(userId)`
- Replace all manual fetching with React Query hooks

**Missing Hooks Needed:**

```typescript
// Add to src/hooks/useUserProfile.ts
export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", "followers", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const { data, error } = await getFollowers(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", "following", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const { data, error } = await getFollowing(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function usePendingFollowRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["followRequests", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const { data, error } = await getPendingFollowRequests(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

---

## 🟡 Style Violations

### 3. Inline Styles (Tailwind-Only Violation)

**Files Affected:** 12 files with 107 inline style occurrences

**Files:**

- `src/components/UserSearch.tsx` - **21 inline styles** (major violation)
- `src/components/PrivacySettings.tsx` - 26 inline styles
- `src/components/FollowButton.tsx` - 1 inline style
- `src/components/Doro.tsx` - 1 inline style
- `src/components/CreateDoro.tsx` - 1 inline style
- `src/components/DoroDetail.tsx` - 3 inline styles
- `src/components/FriendsLeaderboard.tsx` - 15 inline styles
- `src/components/GlobalLeaderboard.tsx` - 10 inline styles
- `src/components/FollowersModal.tsx` - 20 inline styles
- `src/components/FollowRequestsBanner.tsx` - 3 inline styles
- `src/components/Login.tsx` - 2 inline styles
- `src/components/LeaderboardTabs.tsx` - 4 inline styles

**Violation:**

```typescript
// ❌ WRONG
style={{
  width: '100%',
  padding: '12px 16px',
  fontSize: '16px',
  borderRadius: '12px',
  border: '2px solid #e0e0e0',
}}
```

**Required Fix:**

- Convert all inline styles to Tailwind classes
- Use `tailwind.config.js` for custom values if needed
- Only exception: dynamic styles that must be computed at runtime (rare)

**Example Fix:**

```typescript
// ✅ CORRECT
className = "w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300";
```

---

## ✅ Components Following Conventions

These components correctly follow `agents.md` conventions:

1. **Feed.tsx** ✅

   - Uses `useFeed()` and `useSearchPomodoros()` hooks
   - No manual data fetching

2. **Search.tsx** ✅

   - Uses `useSearchPomodoros()` and `useFeed()` hooks
   - No manual data fetching

3. **Doro.tsx** ✅

   - Uses mutation hooks: `useLikeMutation()`, `useUnlikeMutation()`, `useCommentMutation()`
   - Proper React Query pattern

4. **DoroDetail.tsx** ✅
   - Uses `usePomodoroDetail()` hook
   - Uses mutation hooks correctly
   - Proper React Query pattern

---

## 📊 Summary

### Violation Count:

- **Critical React Query Violations:** 2 components
- **Style Violations:** 12 files, 107 inline styles
- **Total Files Needing Updates:** 14 files

### Priority Order:

1. **HIGH:** UserSearch.tsx - Complete rewrite needed
2. **HIGH:** UserProfile.tsx - Multiple hooks needed
3. **MEDIUM:** Inline styles cleanup (can be done incrementally)

### Estimated Effort:

- **UserSearch.tsx:** ~2-3 hours (create hooks + refactor + remove inline styles)
- **UserProfile.tsx:** ~1-2 hours (create hooks + refactor)
- **Inline Styles:** ~4-6 hours (across 12 files, can be done incrementally)

---

## 🔧 Recommended Action Plan

### Phase 1: Create Missing Hooks (1-2 hours)

1. Create `src/hooks/useUserSearch.ts` with:
   - `useSearchUsers()`
   - `useSuggestedUsers()`
2. Add to `src/hooks/useUserProfile.ts`:
   - `useFollowers()`
   - `useFollowing()`
   - `usePendingFollowRequests()`

### Phase 2: Refactor Components (2-3 hours)

1. Refactor `UserSearch.tsx` to use new hooks
2. Refactor `UserProfile.tsx` to use existing + new hooks
3. Remove all `useState`/`useEffect` data fetching patterns

### Phase 3: Style Cleanup (4-6 hours, can be incremental)

1. Start with `UserSearch.tsx` (highest count)
2. Work through other files systematically
3. Update `tailwind.config.js` if custom values needed

---

## 📝 Notes

- **AuthContext.tsx** uses direct Supabase calls, but this is acceptable for auth context initialization
- Most components are already following conventions well
- The violations are concentrated in 2 main components
- Inline styles are widespread but low-priority (cosmetic)
