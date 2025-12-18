# 🧪 Testing Plan - Following System & RLS

**Date:** December 17, 2025  
**Phase:** Phase 4 - Testing  
**Focus:** Following system, RLS policies, and privacy model

---

## ✅ Completed Setup

- ✅ Database schema with RLS policies
- ✅ Following system backend (database functions)
- ✅ Storage bucket created (pomodoro-images)
- ✅ Following UI components built:
  - FollowButton.tsx
  - GlobalLeaderboard.tsx
  - FriendsLeaderboard.tsx
  - UserSearch.tsx
  - LeaderboardTabs.tsx

---

## 🎯 Testing Objectives

### 1. RLS Policy Validation

**Goal:** Ensure Row-Level Security works correctly for privacy

**Test Cases:**

#### A. Pomodoro Visibility
- [ ] User can see their own pomodoros
- [ ] User can see pomodoros from users they follow
- [ ] User CANNOT see pomodoros from users they don't follow
- [ ] Unfollowing a user immediately hides their pomodoros

#### B. Feed Filtering
- [ ] Feed shows only: own pomodoros + followed users' pomodoros
- [ ] Feed automatically updates when follow/unfollow occurs
- [ ] Feed respects completed=true filter

#### C. Likes & Comments
- [ ] Users can like visible pomodoros only
- [ ] Users can comment on visible pomodoros only
- [ ] Users can only delete their own likes/comments
- [ ] Likes/comments from non-followed users are hidden

#### D. Profile Privacy
- [ ] User profiles (name, avatar) are publicly visible
- [ ] Pomodoro count is publicly visible (leaderboard)
- [ ] Individual pomodoros are private (follow-only)

### 2. Following System Functionality

**Test Cases:**

#### A. Follow/Unfollow
- [ ] Click "Follow" adds user to following list
- [ ] Click "Unfollow" removes user from following list
- [ ] Following count updates correctly
- [ ] Follower count updates correctly
- [ ] Cannot follow self (button hidden)
- [ ] Cannot follow same user twice

#### B. Leaderboard Filtering
- [ ] Friends Leaderboard shows only followed users + self
- [ ] Global Leaderboard shows all users
- [ ] Leaderboard counts are accurate
- [ ] Clicking user navigates to profile
- [ ] Follow button works from leaderboard

#### C. User Search
- [ ] Search finds users by name (case-insensitive)
- [ ] Search results show follow status
- [ ] Search results show follower count
- [ ] Search results show weekly completion count
- [ ] Can follow directly from search results
- [ ] Debouncing works (doesn't spam queries)

### 3. Integration Testing

**Test Cases:**

#### A. Authentication Flow
- [ ] Google OAuth login works
- [ ] User profile auto-created on first login
- [ ] Session persists across page refreshes
- [ ] Logout clears session
- [ ] Protected routes redirect to /login

#### B. Image Upload
- [ ] Can upload image when creating pomodoro
- [ ] Image stored in correct path (user_id/filename)
- [ ] Image URL saved to pomodoro record
- [ ] Image visible in feed
- [ ] Can view images from followed users only
- [ ] Storage RLS policies work correctly

#### C. Real-time Updates (Optional)
- [ ] New pomodoros appear in feed
- [ ] Likes update live
- [ ] Comments appear immediately
- [ ] Leaderboard refreshes

---

## 🛠 Testing Environment Setup

### Prerequisites

```bash
# Ensure dev server is running
npm run dev

# Open app at http://localhost:5173/
```

### Test User Accounts

**Create 3+ test Google accounts:**
1. Primary user (yourself)
2. Test user A
3. Test user B

**Why:** Need multiple accounts to test:
- Following relationships
- RLS visibility rules
- Feed filtering
- Leaderboard display

### Test Data Setup

**Steps:**

1. **Login with User A**
   - Create 2-3 completed pomodoros
   - Add images to some

2. **Login with User B**
   - Create 2-3 completed pomodoros
   - Add different images

3. **Login with Primary User**
   - Create 2-3 completed pomodoros
   - Follow User A (should see their pomodoros)
   - Don't follow User B (should NOT see their pomodoros)

---

## 📋 Manual Test Checklist

### Test 1: RLS - Feed Visibility

**Setup:**
- Primary user follows User A only
- User A has 3 completed pomodoros
- User B has 3 completed pomodoros

**Test:**
1. Login as Primary user
2. Go to Feed
3. **Expected:** See own pomodoros + User A's pomodoros
4. **Expected:** NOT see User B's pomodoros
5. Click "Follow" on User B (from search or leaderboard)
6. **Expected:** User B's pomodoros now appear in feed
7. Unfollow User B
8. **Expected:** User B's pomodoros disappear

**Pass Criteria:** ✅ Only followed users' content visible

---

### Test 2: Following System

**Test:**
1. Go to Global Leaderboard
2. Click "Follow" on a user
3. **Expected:** Button changes to "Following"
4. Go to Friends Leaderboard
5. **Expected:** User now appears in list
6. Go back to Global, click "Unfollow"
7. **Expected:** User disappears from Friends Leaderboard

**Pass Criteria:** ✅ Follow state updates everywhere

---

### Test 3: User Search

**Test:**
1. Go to User Search page (needs routing)
2. Type partial username
3. **Expected:** See matching users with stats
4. **Expected:** Follow button shows correct state
5. Click "Follow" from search
6. **Expected:** Button updates, user added to following

**Pass Criteria:** ✅ Search and follow work together

---

### Test 4: Image Upload

**Test:**
1. Create new pomodoro
2. Upload image (JPG, PNG, etc.)
3. Complete timer
4. **Expected:** Image appears in feed
5. Logout, login as different user (non-follower)
6. **Expected:** Cannot see pomodoro or image (RLS)

**Pass Criteria:** ✅ Images respect RLS policies

---

### Test 5: Performance

**Test:**
1. Feed load time < 500ms
2. Leaderboard load time < 300ms
3. Search results < 200ms (after debounce)
4. Image upload < 2s (for 1MB file)

**Tools:**
- Chrome DevTools Network tab
- Supabase Dashboard > Database > Query Performance

**Pass Criteria:** ✅ All operations fast

---

## 🐛 Known Issues to Watch For

### Potential Bugs

1. **RLS Not Working**
   - Symptom: See all pomodoros, not just followed
   - Fix: Check RLS policies enabled on tables
   - Debug: Use Supabase SQL editor to test policies

2. **Follow Button State**
   - Symptom: Button doesn't update after click
   - Fix: Check `isFollowing` state refresh
   - Debug: Console.log the follow/unfollow response

3. **Feed Not Updating**
   - Symptom: New follows don't show in feed
   - Fix: Add refresh after follow action
   - Debug: Check if pomodoro query respects RLS

4. **Leaderboard Empty**
   - Symptom: No users in Friends Leaderboard
   - Fix: Check `get_friends_leaderboard` function
   - Debug: Call function directly in Supabase SQL

5. **Image Upload Fails**
   - Symptom: Upload error or 403 forbidden
   - Fix: Check storage RLS policies
   - Debug: Verify bucket exists and policies applied

---

## 🔍 SQL Debugging Queries

Run these in Supabase SQL Editor to debug issues:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test pomodoro visibility for a user
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM pomodoros WHERE completed = true;

-- Check follow relationships
SELECT 
  f.follower_id,
  fu.user_name as follower,
  f.following_id,
  tu.user_name as following
FROM follows f
JOIN users fu ON fu.id = f.follower_id
JOIN users tu ON tu.id = f.following_id;

-- Verify leaderboard function
SELECT * FROM get_global_leaderboard();
SELECT * FROM get_friends_leaderboard('user-uuid-here');

-- Check storage policies
SELECT * FROM storage.objects 
WHERE bucket_id = 'pomodoro-images' 
LIMIT 10;
```

---

## ✅ Test Completion Criteria

**Ready for Production When:**

- [ ] All RLS tests pass
- [ ] Following/unfollowing works reliably
- [ ] Leaderboards filter correctly
- [ ] User search finds and follows users
- [ ] Image upload works with RLS
- [ ] Performance benchmarks met
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

**Tester:** [Name]
**Duration:** [Time]
**Environment:** [Local/Staging/Production]

### Results:

| Test Case | Status | Notes |
|-----------|--------|-------|
| Feed Visibility | ✅/❌ | |
| Follow/Unfollow | ✅/❌ | |
| Global Leaderboard | ✅/❌ | |
| Friends Leaderboard | ✅/❌ | |
| User Search | ✅/❌ | |
| Image Upload | ✅/❌ | |
| Performance | ✅/❌ | |

### Issues Found:
1. [Issue description]
2. [Issue description]

### Blockers:
- [ ] [Blocker description]
```

---

## 🚀 Next Steps After Testing

1. **Fix any bugs found**
2. **Add routes for new UI components**
3. **Upload migrated images (optional)**
4. **Performance optimization if needed**
5. **Deploy to production**
6. **User acceptance testing**
7. **Monitor logs for errors**

---

**Testing Status:** 🟡 Ready to begin  
**Estimated Time:** 2-3 hours for full test suite  
**Priority:** High - required before Phase 5 launch
