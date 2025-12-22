# LegacyUser Cleanup Plan

## Overview
Remove the `LegacyUser` compatibility type that was created during the Sanity → Supabase migration. This type bridges the old format (`_id`, `userName`, `image`) with the new Supabase format (`id`, `user_name`, `avatar_url`).

## Current State Analysis

### Where LegacyUser is Used:
1. **Sidebar.tsx** - Accepts `user?: LegacyUser` prop, uses `user._id`, `user.userName`, `user.image`
2. **Home.tsx** - Transforms `UserProfile` (Supabase) → `LegacyUser` format (lines 102-108)
3. **CreateDoro.tsx** - Transforms leaderboard data to `LegacyUser` format for `DoroContext` (lines 264-269)

### Current Data Flow:
- `AuthContext` provides `userProfile` (Supabase `User` type)
- `Home.tsx` transforms it to `LegacyUser` format
- `Sidebar` receives `LegacyUser` and uses legacy field names
- Leaderboard data is transformed from Supabase format to `LegacyUser` format

## Testing-First Approach

### Phase 1: Write Baseline Tests (BEFORE Changes)

#### 1.1 Create Sidebar Tests
**File:** `src/components/__tests__/Sidebar.test.tsx`

Test cases to cover:
- ✅ Renders without user prop
- ✅ Renders with LegacyUser prop (current format)
- ✅ Displays user name from `userName` field
- ✅ Displays user avatar from `image` field
- ✅ Links to user profile using `_id` field
- ✅ Calls `getWeeklyLeaderboard` with `user._id` when user is provided
- ✅ Transforms leaderboard data correctly (Supabase → LegacyUser format)
- ✅ Updates DoroContext leaderboard with transformed data
- ✅ Renders CompactLeaderboard component
- ✅ Handles navigation links correctly

#### 1.2 Create Home Tests
**File:** `src/container/__tests__/Home.test.tsx`

Test cases to cover:
- ✅ Transforms UserProfile to LegacyUser format correctly
- ✅ Passes LegacyUser to Sidebar component
- ✅ Handles null/undefined userProfile gracefully
- ✅ Memoizes user transformation to prevent unnecessary re-renders
- ✅ Passes user to DoroWrapper correctly

#### 1.3 Update CreateDoro Tests
**File:** `src/components/__tests__/CreateDoro.test.tsx`

Additional test cases:
- ✅ Transforms leaderboard data to LegacyUser format in `getUpdatedLeaders`
- ✅ Updates DoroContext with transformed leaderboard data
- ✅ Uses `user._id` when calling `getWeeklyLeaderboard`

#### 1.4 Run Baseline Tests
```bash
npm test
```
- Document all passing tests
- This establishes our baseline before refactoring

---

### Phase 2: Refactoring (Implementation)

#### 2.1 Update Sidebar Component
**File:** `src/components/Sidebar.tsx`

Changes:
1. Change `SidebarProps.user` type from `LegacyUser` to `User`
2. Update all references:
   - `user._id` → `user.id`
   - `user.userName` → `user.user_name`
   - `user.image` → `user.avatar_url`
3. Update `Leader` interface to extend `User` instead of `LegacyUser`
4. Remove transformation logic (lines 68-73) - use Supabase data directly
5. Update `useEffect` dependency from `user?._id` to `user?.id`

#### 2.2 Update Home Component
**File:** `src/container/Home.tsx`

Changes:
1. Remove `LegacyUser` transformation (lines 102-108)
2. Pass `userProfile` directly to `Sidebar` (or `null` if not available)
3. Update mobile navbar references:
   - `user?._id` → `userProfile?.id`
   - `user?.image` → `userProfile?.avatar_url`
4. Update `DoroWrapper` prop to use `userProfile` instead of transformed `user`

#### 2.3 Clean Up DoroContext Leaderboard
**Files:** `src/utils/DoroContext.ts`, `src/components/CreateDoro.tsx`, `src/components/Sidebar.tsx`

Investigation:
- Check if `DoroContext.leaderBoard` is actually used anywhere
- `CompactLeaderboard` uses `LeaderboardContext`, not `DoroContext`
- If unused, remove `leaderBoard` and `setLeaderBoard` from `DoroContext`
- If still needed, update to use Supabase format instead of LegacyUser format

Changes:
1. Remove transformation in `CreateDoro.tsx` (lines 264-269) if `DoroContext.leaderBoard` is removed
2. Remove transformation in `Sidebar.tsx` (lines 68-73) if `DoroContext.leaderBoard` is removed
3. Update `DoroContext` type definition if leaderboard format changes

#### 2.4 Remove LegacyUser Type
**File:** `src/types/models.ts`

Changes:
1. Remove `LegacyUser` interface (lines 50-54)
2. Remove import from `Sidebar.tsx`

---

### Phase 3: Update Tests (AFTER Changes)

#### 3.1 Update Sidebar Tests
**File:** `src/components/__tests__/Sidebar.test.tsx`

Update test cases:
- ✅ Change mock user to use Supabase format (`id`, `user_name`, `avatar_url`)
- ✅ Update assertions to check `user_name` instead of `userName`
- ✅ Update assertions to check `avatar_url` instead of `image`
- ✅ Update assertions to check `id` instead of `_id`
- ✅ Verify no transformation happens (data used directly)
- ✅ Verify `getWeeklyLeaderboard` called with `user.id`

#### 3.2 Update Home Tests
**File:** `src/container/__tests__/Home.test.tsx`

Update test cases:
- ✅ Verify no transformation happens
- ✅ Verify `userProfile` passed directly to Sidebar
- ✅ Verify `userProfile` passed directly to DoroWrapper

#### 3.3 Update CreateDoro Tests
**File:** `src/components/__tests__/CreateDoro.test.tsx`

Update test cases:
- ✅ Update mock user to use Supabase format
- ✅ If `DoroContext.leaderBoard` removed, remove related tests
- ✅ If `DoroContext.leaderBoard` kept, update to test Supabase format

#### 3.4 Run All Tests
```bash
npm test
```

Expected results:
- All tests should pass
- No TypeScript errors
- No runtime errors

---

### Phase 4: Verification & Cleanup

#### 4.1 Manual Testing Checklist
- [ ] Sidebar displays user info correctly
- [ ] User profile link works correctly
- [ ] Leaderboard displays correctly
- [ ] Mobile navbar displays user correctly
- [ ] No console errors or warnings

#### 4.2 Code Review
- [ ] No remaining references to `LegacyUser`
- [ ] No remaining references to `_id`, `userName`, `image` (except in old test mocks if needed)
- [ ] All imports updated correctly
- [ ] TypeScript compilation succeeds

#### 4.3 Final Cleanup
- [ ] Remove any unused transformation functions
- [ ] Update any remaining comments mentioning "legacy" or "temporary"
- [ ] Verify no dead code remains

---

## Risk Assessment

### Low Risk:
- Sidebar component changes (isolated, well-tested)
- Home component changes (straightforward transformation removal)

### Medium Risk:
- DoroContext leaderboard cleanup (need to verify it's unused)
- Multiple components may need updates if DoroContext changes

### Mitigation:
- Comprehensive test coverage before changes
- Incremental changes with test runs after each step
- Keep transformation code commented out initially as backup

---

## Success Criteria

✅ All tests pass before and after refactoring
✅ No TypeScript errors
✅ No runtime errors
✅ `LegacyUser` type completely removed
✅ All components use Supabase `User` type directly
✅ No data transformation code remains
✅ Code is cleaner and more maintainable

