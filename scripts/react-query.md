# React Query Migration Plan

## Goal

Eliminate duplicate network requests by implementing React Query for automatic request deduplication and caching.

## Current Issues

- `get_global_leaderboard` called **3 times** on homepage load
- `users` query (current user) called **2 times** on homepage load
- Manual state management with useState/useEffect in every component

## Expected Results

- Reduce network requests from 11 to ~7-8 on homepage
- Cleaner, more maintainable code (~50 lines vs ~300 lines)
- Automatic caching and deduplication
- Better UX with instant cached data

---

## Phase 1: Pre-Implementation Testing

### Step 1.1: Run Existing Tests

```bash
npm test
```

- Document current test pass/fail status
- Baseline for regression testing

### Step 1.2: Identify Components That Will Change

Components using data fetching that will be migrated:

- [ ] `GlobalLeaderboard.tsx` - uses `getGlobalLeaderboard()`
- [ ] `FriendsLeaderboard.tsx` - uses `getFriendsLeaderboard()`
- [ ] `CompactLeaderboard.tsx` - uses both leaderboard functions
- [ ] `Feed.tsx` - uses `getFeed()`, `searchPomodoros()`
- [ ] `UserProfile.tsx` - uses `getUserProfile()`, `getUserPomodoros()`
- [ ] `Home.tsx` - uses direct `supabase.from("users")` query
- [ ] `FollowButton.tsx` - uses `getUserProfile()` and follow mutations
- [ ] `Doro.tsx` - uses like/comment mutations
- [ ] `DoroDetail.tsx` - uses comment/like mutations
- [ ] `FollowRequestsBanner.tsx` - uses `getPendingFollowRequestsCount()`

### Step 1.3: Review and Augment Tests

For each component above:

- [ ] Check if tests exist
- [ ] Add/update tests to verify:
  - Data fetching behavior
  - Loading states
  - Error handling
  - User interactions (likes, comments, follows)
  - Cache invalidation scenarios

**Specific test files to check/augment:**

- `src/components/__tests__/GlobalLeaderboard.test.tsx` (create if missing)
- `src/components/__tests__/FriendsLeaderboard.test.tsx` (create if missing)
- `src/components/__tests__/CompactLeaderboard.test.tsx` (exists)
- `src/components/__tests__/Feed.test.tsx` (create if missing)
- `src/components/__tests__/UserProfile.test.tsx` (exists)
- `src/components/__tests__/FollowButton.test.tsx` (exists)
- `src/components/__tests__/Doro.test.tsx` (exists)
- `src/components/__tests__/DoroDetail.test.tsx` (exists)

### Step 1.4: Run Augmented Tests

```bash
npm test
```

- Ensure all new/updated tests pass before migration

---

## Phase 2: React Query Setup

### Step 2.1: Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### Step 2.2: Create Query Client Configuration

**File:** `src/lib/queryClient.ts` (new file)

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Step 2.3: Wrap App in QueryClientProvider

**File:** `src/main.tsx`

- Import `QueryClientProvider` and `queryClient`
- Import `ReactQueryDevtools` (dev only)
- Wrap existing app with provider

### Step 2.4: Create Custom Hooks

**File:** `src/hooks/useLeaderboard.ts` (new file)

- `useGlobalLeaderboard()`
- `useFriendsLeaderboard()`

**File:** `src/hooks/useUserProfile.ts` (new file)

- `useUserProfile(userId)`
- `useCurrentUserProfile()` - extends AuthContext

**File:** `src/hooks/useFeed.ts` (new file)

- `useFeed(userId?)`
- `useSearchPomodoros(term)`

**File:** `src/hooks/useUserPomodoros.ts` (new file)

- `useUserPomodoros(userId, page)`

**File:** `src/hooks/useMutations.ts` (new file)

- `useLikeMutation()`
- `useUnlikeMutation()`
- `useCommentMutation()`
- `useFollowMutation()`
- `useUnfollowMutation()`

---

## Phase 3: Component Migration

### Step 3.1: Migrate Leaderboard Components

**Order of migration:**

1. `GlobalLeaderboard.tsx`

   - Replace useState/useEffect with `useGlobalLeaderboard()`
   - Remove manual loading state management

2. `FriendsLeaderboard.tsx`

   - Replace useState/useEffect with `useFriendsLeaderboard()`

3. `CompactLeaderboard.tsx`
   - Use both hooks
   - Remove duplicate fetching logic

**Expected impact:** Eliminates 2-3 duplicate `get_global_leaderboard` calls

### Step 3.2: Migrate Home.tsx

- Remove manual `supabase.from("users")` fetch
- Use `useCurrentUserProfile()` hook
- Update AuthContext to include full user profile data

**Expected impact:** Eliminates 1 duplicate user query

### Step 3.3: Migrate Feed Components

1. `Feed.tsx` - use `useFeed()` and `useSearchPomodoros()`
2. `Doro.tsx` - use mutation hooks for likes/comments
3. `DoroDetail.tsx` - use mutation hooks

### Step 3.4: Migrate User Profile Components

1. `UserProfile.tsx` - use `useUserProfile()` and `useUserPomodoros()`
2. `FollowButton.tsx` - use `useFollowMutation()`
3. `FollowRequestsBanner.tsx` - use query hook

### Step 3.5: Update AuthContext (Optional Enhancement)

**File:** `src/contexts/AuthContext.tsx`

- Consider integrating with React Query
- Or keep separate (auth is special case)
- Extend to include full user profile from `users` table

---

## Phase 4: Testing & Validation

### Step 4.1: Update Test Setup

**File:** `src/__tests__/setup.ts`

- Add QueryClient setup for tests
- Wrap test components with QueryClientProvider
- Mock React Query hooks if needed

### Step 4.2: Update Component Tests

For each migrated component:

- Update imports (hooks instead of direct query functions)
- Update mocks to work with React Query
- Ensure loading/error states still work
- Verify cache invalidation works

### Step 4.3: Run Full Test Suite

```bash
npm test
```

- All tests should pass
- Fix any failures related to React Query setup

### Step 4.4: Manual Testing Checklist

- [ ] Homepage loads without duplicate requests
- [ ] Leaderboards show data correctly
- [ ] Switching between Friends/Global tabs is instant (cached)
- [ ] User profile loads without duplicate requests
- [ ] Likes/comments update UI immediately (optimistic updates)
- [ ] Following/unfollowing works correctly
- [ ] Feed refreshes on window focus
- [ ] DevTools show correct query states

### Step 4.5: Network Request Validation

1. Open DevTools → Network tab
2. Clear cache and reload homepage
3. Document all network requests
4. Compare to original HAR file
5. Verify:
   - `get_global_leaderboard` called only **1 time** (not 3)
   - `users` query called only **1 time** (not 2)
   - Total requests reduced to ~7-8

---

## Phase 5: Cleanup

### Step 5.1: Remove Deprecated Code

- [ ] Remove unused useState/useEffect patterns
- [ ] Remove manual loading state management
- [ ] Clean up any temporary migration code

### Step 5.2: Update Documentation

- [ ] Document new React Query hooks
- [ ] Update component documentation
- [ ] Add notes about query keys and cache invalidation

### Step 5.3: Final Test Run

```bash
npm test
```

- Ensure all tests still pass after cleanup

---

## Query Key Structure

Standardized query keys for cache management:

```typescript
// Leaderboards
['leaderboard', 'global'] // Global leaderboard
['leaderboard', 'friends', userId] // Friends leaderboard
['leaderboard', 'weekly', userId] // Weekly leaderboard

// Users
['user', 'profile', userId] // User profile
['user', 'current'] // Current logged-in user profile
['user', 'pomodoros', userId, page] // User's pomodoros

// Feed
['feed', limit, userId?] // Main feed
['feed', 'search', searchTerm] // Search results

// Social
['followRequests', 'count', userId] // Follow request count
['followRequests', 'pending', userId] // Pending requests list
['blocks', userId] // Blocked users

// Pomodoros
['pomodoro', doroId] // Single pomodoro detail
['pomodoro', doroId, 'comments'] // Pomodoro comments
['pomodoro', doroId, 'likes'] // Pomodoro likes
```

---

## Cache Invalidation Patterns

### After mutations:

```typescript
// After liking a pomodoro
queryClient.invalidateQueries(["pomodoro", doroId]);
queryClient.invalidateQueries(["feed"]);

// After following someone
queryClient.invalidateQueries(["leaderboard", "friends"]);
queryClient.invalidateQueries(["user", "profile", targetUserId]);

// After completing a pomodoro
queryClient.invalidateQueries(["leaderboard"]);
queryClient.invalidateQueries(["feed"]);
queryClient.invalidateQueries(["user", "current"]);
```

---

## Success Metrics

- [ ] All tests pass
- [ ] Network requests reduced from 11 to ~7-8
- [ ] No duplicate `get_global_leaderboard` calls
- [ ] No duplicate `users` queries
- [ ] Leaderboard tab switching is instant (< 50ms)
- [ ] Code reduced by ~250-300 lines
- [ ] DevTools shows healthy query cache
- [ ] No console errors
- [ ] User experience feels snappier

---

## Rollback Plan

If issues arise:

1. Revert commits in git
2. Uninstall React Query: `npm uninstall @tanstack/react-query @tanstack/react-query-devtools`
3. Restore original component code
4. Run tests to verify rollback success

---

## Notes

- React Query DevTools will be invaluable for debugging
- Start with read-only queries first, then add mutations
- AI should run Test after each component migration and prompt user to test relevant page in browser
- Keep commits small and atomic for easy rollback - prompt user to commit after each component
