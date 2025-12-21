# 🧪 Phase 4: Testing Guide

**Status:** Ready to Begin
**Last Updated:** December 17, 2025

---

## 🚀 Quick Start

**App URL:** http://localhost:5174/
**Requirements:** 3+ Google accounts for multi-user testing

---

## 📋 Pre-Testing Checklist

✅ Dev server running at http://localhost:5174/
✅ TypeScript errors fixed
✅ All components integrated
✅ Database schema ready
✅ RLS policies active

---

## 🎯 Testing Objectives

### 1. **RLS Policy Validation** (Critical - 45 minutes)

**Goal:** Verify Row-Level Security ensures users only see content they're authorized to view.

**Test Scenarios:**

#### Scenario A: Follow/Unfollow Feed Filtering

1. **Setup (User A)**

   - Login with Google Account A
   - Note your user ID from profile
   - Create 2-3 new pomodoros (this week's data)

2. **Setup (User B)**

   - Logout, login with Google Account B
   - Create 2-3 new pomodoros
   - Go to /discover
   - Search for User A
   - Click "Follow" button

3. **Verify (User B)**

   - ✅ User B's feed should show:
     - User A's pomodoros (followed)
     - User B's own pomodoros
   - ❌ User B's feed should NOT show:
     - User C's pomodoros (not followed)
     - Historical data from unfollowed users

4. **Test Unfollow (User B)**
   - Unfollow User A
   - ✅ User A's pomodoros should disappear from feed immediately
   - ✅ Only User B's own pomodoros remain visible

#### Scenario B: Mutual Following

1. **User A follows User B**

   - Both users' content visible to User A

2. **User B already follows User A**

   - Both users' content visible to User B

3. **Verify bidirectional privacy**
   - Each user sees only followed + own content

#### Scenario C: Privacy Boundaries

1. **User C (unfollowed)**

   - Create pomodoros
   - User A should not see them
   - User B should not see them

2. **Direct URL access test**
   - Try accessing another user's pomodoro by ID
   - Should be blocked by RLS

---

### 2. **Following System Functionality** (30 minutes)

**Routes to Test:**

- `/discover` - UserSearch component
- `/leaderboard` - Global & Friends tabs

#### Test: UserSearch (/discover)

1. **Search functionality**

   - ✅ Search by partial name works
   - ✅ Search by full name works
   - ✅ Results display correctly

2. **Follow button states**

   - ✅ Shows "Follow" for unfollowed users
   - ✅ Shows "Following" for followed users
   - ✅ Click toggles state immediately
   - ✅ State persists on page refresh

3. **Edge cases**
   - ✅ Can't follow yourself
   - ✅ Empty search shows all users
   - ✅ No matches shows empty state

#### Test: Leaderboards (/leaderboard)

1. **Global Leaderboard**

   - ✅ Shows all users ranked by pomodoros
   - ✅ Current week filter working
   - ✅ Displays user avatars and names
   - ✅ Shows correct pomodoro counts

2. **Friends Leaderboard**

   - ✅ Shows only followed users
   - ✅ Excludes unfollowed users
   - ✅ Updates when following/unfollowing
   - ✅ Ranks correctly

3. **Tab switching**
   - ✅ Smooth transition between tabs
   - ✅ Data refreshes appropriately

#### Test: FollowButton Component

1. **State management**

   - ✅ Optimistic UI updates
   - ✅ Handles API errors gracefully
   - ✅ Loading states displayed

2. **Database operations**
   - ✅ Creates follow record
   - ✅ Deletes follow record
   - ✅ Updates counts correctly

---

### 3. **Image Upload & Storage** (20 minutes)

**Goal:** Test image upload to Supabase Storage with RLS policies.

#### Test: CreateDoro Image Upload

1. **Upload new image**

   - Go to /create-doro
   - Upload an image
   - Add task details
   - Submit pomodoro
   - ✅ Image uploads to `pomodoro-images` bucket
   - ✅ Image URL stored in database
   - ✅ Image displays in feed

2. **Storage RLS verification**

   - ✅ Can view own uploaded images
   - ✅ Can view followed users' images
   - ❌ Cannot view unfollowed users' images

3. **Image constraints**
   - ✅ File size limits enforced
   - ✅ File type validation works
   - ✅ Error handling for upload failures

---

### 4. **Core Features Regression** (30 minutes)

**Goal:** Ensure all existing features still work correctly.

#### Test: Authentication

1. **Google OAuth**

   - ✅ Login flow works
   - ✅ User profile created in database
   - ✅ Session persists on refresh
   - ✅ Logout works

2. **Protected routes**
   - ✅ Redirects to login when unauthorized
   - ✅ Allows access when authenticated

#### Test: Pomodoro CRUD

1. **Create**

   - ✅ CreateDoro form works
   - ✅ All fields save correctly
   - ✅ Timer styles apply
   - ✅ Privacy settings work

2. **Read**

   - ✅ Feed displays pomodoros
   - ✅ DoroDetail shows full details
   - ✅ Comments load correctly
   - ✅ Likes count accurate

3. **Update**

   - ✅ Can edit own pomodoros
   - ❌ Cannot edit others' pomodoros

4. **Delete**
   - ✅ Can delete own pomodoros
   - ❌ Cannot delete others' pomodoros

#### Test: Likes

1. **Like/Unlike**

   - ✅ Click heart to like
   - ✅ Click again to unlike
   - ✅ Count updates immediately
   - ✅ State persists

2. **RLS enforcement**
   - ✅ Can only like visible pomodoros
   - ❌ Cannot like unfollowed users' content

#### Test: Comments

1. **Create comment**

   - ✅ Add comment to pomodoro
   - ✅ Comment displays immediately
   - ✅ Author info correct

2. **Update/Delete**

   - ✅ Can edit own comments
   - ✅ Can delete own comments
   - ❌ Cannot edit/delete others' comments

3. **RLS enforcement**
   - ✅ Can only comment on visible pomodoros

#### Test: User Profiles

1. **View profile**

   - ✅ /user-profile/:id works
   - ✅ Displays user info
   - ✅ Shows user's pomodoros
   - ✅ Follower/following counts

2. **Edit own profile**
   - ✅ Can update username
   - ✅ Can update avatar
   - ❌ Cannot edit others' profiles

---

### 5. **Performance Testing** (20 minutes)

**Goal:** Identify and optimize slow queries.

#### Monitor Supabase Dashboard

1. **Query Performance**

   - Open Supabase Dashboard
   - Go to Database → Query Performance
   - Watch queries as you test
   - Note any queries > 100ms

2. **Test scenarios**

   - Load feed with 50+ pomodoros
   - Search for users
   - Toggle leaderboard tabs
   - Like/unlike multiple items quickly

3. **Performance metrics**
   - ✅ Feed loads in < 1s
   - ✅ Search results appear instantly
   - ✅ Leaderboards load in < 500ms
   - ✅ Like/unlike feels instant

---

## 🐛 Known Issues to Watch For

### Performance Warnings (from Supabase advisors)

**RLS Init Plan Issues:**

- 15 policies re-evaluate `auth.uid()` for each row
- **Impact:** Suboptimal performance at scale
- **Fix:** Wrap `auth.uid()` in `(select auth.uid())`
- **Priority:** Low (optimize after testing complete)

**Multiple Permissive Policies:**

- `pomodoros` table has 2 SELECT policies
- **Impact:** Each policy executes for every query
- **Fix:** Combine into single policy with OR
- **Priority:** Medium (may affect feed performance)

**Unindexed Foreign Keys:**

- `comments.user_id` lacks index
- `likes.user_id` lacks index
- **Impact:** Slower joins on user lookups
- **Fix:** Add indexes in migration
- **Priority:** Low (small tables)

**Unused Indexes:**

- `idx_pomodoros_completed` never used
- `idx_pomodoros_task_search` never used
- `idx_pomodoros_notes_search` never used
- **Fix:** Remove or use in queries
- **Priority:** Low (cleanup)

### Security Warnings

**Leaked Password Protection:**

- Currently disabled in Supabase Auth
- **Fix:** Enable in Supabase Dashboard → Auth → Settings
- **Priority:** High (enable before production)
- **Link:** https://supabase.com/docs/guides/auth/password-security

---

## 📊 Test Results Template

Use this template to track your testing progress:

```markdown
## Test Session: [Date]

### Tester: [Your Name]

### Accounts Used:

- User A: [email]
- User B: [email]
- User C: [email]

### RLS Policy Tests

- [ ] Feed shows only followed users
- [ ] Unfollow removes content immediately
- [ ] Cannot access unfollowed users' content
- [ ] Likes/comments respect RLS

### Following System Tests

- [ ] UserSearch works at /discover
- [ ] FollowButton toggles correctly
- [ ] Global leaderboard displays
- [ ] Friends leaderboard filters correctly

### Image Upload Tests

- [ ] Image uploads successfully
- [ ] Image displays in feed
- [ ] Storage RLS enforced

### Performance Tests

- [ ] Feed loads < 1s
- [ ] No queries > 100ms
- [ ] UI feels responsive

### Issues Found:

1. [Description]
2. [Description]

### Notes:

[Any observations]
```

---

## 🎯 Success Criteria

**Phase 4 Complete When:**

✅ All RLS policies verified working
✅ Following system fully functional
✅ Image upload tested successfully
✅ No critical bugs found
✅ Performance acceptable (< 1s page loads)
✅ Security advisors reviewed
✅ Test results documented

---

## 🔄 After Testing

### If All Tests Pass:

1. ✅ Mark Phase 4 complete in STATUS.md
2. ✅ Document any minor issues found
3. ✅ Optimize performance warnings (optional)
4. ✅ Proceed to Phase 5: Deployment

### If Issues Found:

1. ⚠️ Document all issues in GitHub Issues
2. 🐛 Prioritize bugs (critical vs. minor)
3. 🔧 Fix critical bugs before deployment
4. 📝 Create technical debt backlog for minor issues
5. 🔁 Re-test after fixes

---

## 🚀 Optional: Upload Historical Images

**If you want to migrate the 425 downloaded images:**

```bash
# Run the storage setup script (create if needed)
npm run setup:storage
```

**Note:** Current leaderboards filter by current week, so historical data won't appear unless you modify the SQL functions.

---

## 📞 Need Help?

**Resources:**

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [Performance Best Practices](https://supabase.com/docs/guides/database/database-linter)

**Common Issues:**

- **Feed not filtering:** Check RLS policies in Supabase Dashboard
- **Images not loading:** Verify storage bucket and RLS policies
- **Slow queries:** Check Database → Query Performance in dashboard
- **Auth errors:** Verify Google OAuth credentials in Supabase settings

---

## ✅ Next Steps

After completing Phase 4 testing:

1. Review and address any critical bugs
2. Optimize performance warnings (optional)
3. Enable leaked password protection in Auth settings
4. Update STATUS.md with test results
5. Proceed to Phase 5: Deployment planning

**Ready to test? Start with RLS Policy Validation using 3 Google accounts!** 🎯
