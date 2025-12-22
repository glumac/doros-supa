# React Query Migration Plan

## Current Status: Mixed Architecture

### Problem Statement

The app currently has a **dual data management system** causing:

- CompactLeaderboard uses React Query ✅
- GlobalLeaderboard and FriendsLeaderboard use LeaderboardContext ❌
- Cache invalidation after pomodoro creation only works for CompactLeaderboard
- Redundant data fetching and state management
- Tests don't properly reflect production behavior

### Architecture Decision: Full React Query Migration (Option A)

**Goal:** Remove LeaderboardContext entirely, migrate all leaderboard components to React Query hooks.

**Benefits:**

- Single source of truth for data management
- Automatic cache invalidation across all components
- Better performance (shared cache)
- Simpler testing
- Follows established patterns in codebase

---

## Migration Plan

### Phase 1: Fix Immediate Issue ✅ COMPLETED

- [x] Create `useCreatePomodoroMutation` hook with cache invalidation
- [x] Update CreateDoro to use mutation hook
- [x] Add QueryClientProvider to App.tsx
- [x] Update CompactLeaderboard to use React Query hooks
- [x] Write tests for mutation hook

**Result:** CompactLeaderboard now updates in real-time after pomodoro creation

---

### Phase 2: Migrate Remaining Components (IN PROGRESS)

#### Step 1: Update GlobalLeaderboard Component

**File:** `src/components/GlobalLeaderboard.tsx`

**Current:**

```tsx
import { useLeaderboards } from "../contexts/LeaderboardContext";
const { globalLeaderboard, loading } = useLeaderboards();
```

**Target:**

```tsx
import { useGlobalLeaderboard } from "../hooks/useLeaderboard";
import { useAuth } from "../contexts/AuthContext";
const { user } = useAuth();
const { data: globalLeaderboard = [], isLoading: loading } =
  useGlobalLeaderboard(user?.id);
```

**Files to modify:**

- [ ] `src/components/GlobalLeaderboard.tsx`
- [ ] `src/components/__tests__/GlobalLeaderboard.test.tsx` (if exists)

---

#### Step 2: Update FriendsLeaderboard Component

**File:** `src/components/FriendsLeaderboard.tsx`

**Current:**

```tsx
import { useLeaderboards } from "../contexts/LeaderboardContext";
const { friendsLeaderboard, loading } = useLeaderboards();
```

**Target:**

```tsx
import { useFriendsLeaderboard } from "../hooks/useLeaderboard";
import { useAuth } from "../contexts/AuthContext";
const { user } = useAuth();
const { data: friendsLeaderboard = [], isLoading: loading } =
  useFriendsLeaderboard(user?.id);
```

**Files to modify:**

- [ ] `src/components/FriendsLeaderboard.tsx`
- [ ] `src/components/__tests__/FriendsLeaderboard.test.tsx` (if exists)

---

#### Step 3: Remove LeaderboardProvider from Component Tree

**File:** `src/container/Home.tsx`

**Current:**

```tsx
import { LeaderboardProvider } from "../contexts/LeaderboardContext";
// ...
<LeaderboardProvider>
  <Routes>...</Routes>
</LeaderboardProvider>;
```

**Target:**

```tsx
// Remove import
// Remove wrapper - no longer needed
<Routes>...</Routes>
```

**Files to modify:**

- [ ] `src/container/Home.tsx`

---

#### Step 4: Update All Tests

Remove `LeaderboardProvider` from test wrappers, add `QueryClientProvider` if missing:

**Files to update:**

- [ ] `src/components/__tests__/CompactLeaderboard.test.tsx` - Remove LeaderboardProvider
- [ ] `src/components/__tests__/CompactLeaderboard.integration.test.tsx` - Remove LeaderboardProvider
- [ ] `src/components/__tests__/GlobalLeaderboard.test.tsx` - Add QueryClientProvider, remove LeaderboardProvider
- [ ] `src/components/__tests__/FriendsLeaderboard.test.tsx` - Add QueryClientProvider, remove LeaderboardProvider

**Standard Test Wrapper:**

```tsx
const renderWithProviders = (component, user = mockUser) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ user, ... }}>
          {component}
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};
```

---

#### Step 5: Delete LeaderboardContext

**After all components migrated and tests pass:**

**Files to delete:**

- [ ] `src/contexts/LeaderboardContext.tsx`
- [ ] `src/contexts/LeaderboardContext.test.tsx` (if exists)

**Files to update (remove imports):**

- [ ] Any remaining files importing from LeaderboardContext

---

### Phase 3: Verification & Testing

#### Manual Testing Checklist

- [ ] Start dev server, navigate to app
- [ ] Verify Global leaderboard displays correctly
- [ ] Verify Friends leaderboard displays correctly
- [ ] Verify CompactLeaderboard in sidebar displays correctly
- [ ] Complete a pomodoro
- [ ] **Verify all three leaderboards update in real-time**
- [ ] Switch between tabs (Global/Friends)
- [ ] Follow/unfollow a user, verify friends leaderboard updates
- [ ] Check browser console for errors

#### Automated Testing

- [ ] Run all component tests: `npm test -- src/components/__tests__`
- [ ] Run all hook tests: `npm test -- src/hooks/__tests__`
- [ ] Run integration tests: `npm test -- integration`
- [ ] Verify 100% test pass rate

---

## Implementation Order

### Step-by-Step Execution

1. **Migrate GlobalLeaderboard** (low risk, standalone component)
2. **Migrate FriendsLeaderboard** (low risk, standalone component)
3. **Update all tests** (ensure everything works)
4. **Remove LeaderboardProvider from Home.tsx** (breaking change)
5. **Run full test suite** (catch any issues)
6. **Manual testing** (verify real-time updates work)
7. **Delete LeaderboardContext files** (cleanup)
8. **Final verification** (app works end-to-end)

---

## Rollback Plan

If migration causes issues:

1. Revert component changes in reverse order
2. Re-add LeaderboardProvider to Home.tsx
3. Keep QueryClientProvider (doesn't hurt to have both)
4. CompactLeaderboard will still work with React Query
5. Other components will fall back to context

---

## Success Criteria

✅ All leaderboard components use React Query hooks
✅ No LeaderboardContext in codebase
✅ All tests pass
✅ Real-time updates work across all leaderboards after pomodoro creation
✅ No console errors in browser
✅ No performance regression

---

## Notes

- React Query hooks already exist: `useGlobalLeaderboard`, `useFriendsLeaderboard`
- Query keys are consistent: `["leaderboard", "global"]`, `["leaderboard", "friends"]`
- Mutation hook invalidates both query keys automatically
- StaleTime is set to 2 minutes in hooks (reasonable for leaderboard data)
- Tests should mock query functions, not context

---

## Current Progress

- [x] Phase 1 Complete
- [x] Phase 2 Step 1 - GlobalLeaderboard migration
- [x] Phase 2 Step 2 - FriendsLeaderboard migration
- [x] Phase 2 Step 3 - Remove LeaderboardProvider
- [x] Phase 2 Step 4 - Update tests
- [x] Phase 2 Step 5 - Delete context
- [x] Phase 3 - Verification

## Migration Complete! ✅

All leaderboard components now use React Query hooks. The LeaderboardContext has been completely removed from the codebase. Real-time updates now work across all three leaderboard components (Compact, Global, Friends) when pomodoros are created.
