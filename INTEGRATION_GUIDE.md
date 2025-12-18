# 🔌 Integration Guide - Following System UI

**Date:** December 17, 2025  
**Purpose:** Add new following system components to the app routing

---

## 📦 Components Ready for Integration

**Location:** `/src/components/`

1. ✅ `FollowButton.tsx` - Follow/unfollow any user
2. ✅ `GlobalLeaderboard.tsx` - All users leaderboard
3. ✅ `FriendsLeaderboard.tsx` - Followed users leaderboard
4. ✅ `UserSearch.tsx` - Search users by name
5. ✅ `LeaderboardTabs.tsx` - Toggle between Global/Friends

---

## 🛤 Routing Changes Needed

### Option A: Add New Routes (Recommended)

**File:** `src/container/Home.tsx`

Add these routes inside the `<Routes>` component:

```tsx
<Routes>
  {/* Existing routes */}
  <Route path="/user-profile/:userId" element={<UserProfile />} />
  
  {/* New routes for following system */}
  <Route path="/discover" element={<UserSearch />} />
  <Route path="/leaderboard" element={<LeaderboardTabs />} />
  
  {/* Default route */}
  <Route path="/*" element={<DoroWrapper user={user} />} />
</Routes>
```

**Updates needed:**

1. Import new components:
```tsx
import { 
  Sidebar, 
  UserProfile,
  UserSearch,      // Add
  LeaderboardTabs  // Add
} from "../components";
```

2. Add navigation links to Sidebar:
```tsx
{/* In Sidebar.tsx */}
<NavLink to="/discover">🔍 Find Friends</NavLink>
<NavLink to="/leaderboard">🏆 Leaderboard</NavLink>
```

---

### Option B: Replace Sidebar Leaderboard

**File:** `src/components/Sidebar.tsx`

Replace the existing weekly leaderboard section with `LeaderboardTabs`:

**Current code (lines ~140-180):**
```tsx
<div>
  <h3 className="mt-2 px-5 font-semibold text-base 2xl:text-xl">
    This Week's Leaders
  </h3>
  {/* ... existing leaderboard rendering ... */}
</div>
```

**Replace with:**
```tsx
import LeaderboardTabs from './LeaderboardTabs';

{/* In the sidebar content */}
<div className="mt-5 px-3">
  <LeaderboardTabs />
</div>
```

**Pros:**
- Immediate integration
- Users see dual leaderboards right away
- No new routes needed

**Cons:**
- Sidebar gets taller
- Might be cramped on mobile

---

### Option C: Hybrid Approach (Best UX)

**Sidebar:** Keep compact weekly leaderboard (current)  
**New Pages:** Add full leaderboard + search pages

**Implementation:**

1. **Keep Sidebar as-is** (shows top 10 weekly leaders)

2. **Add Leaderboard page** at `/leaderboard`
   - Full LeaderboardTabs with all users
   - More detailed stats
   - Click "View Full Leaderboard" from sidebar

3. **Add Discover page** at `/discover`
   - UserSearch component
   - Featured users section
   - Suggested users to follow

4. **Update navigation:**
```tsx
{/* Add to Sidebar */}
<NavLink to="/leaderboard">
  View Full Leaderboard →
</NavLink>
<NavLink to="/discover">
  🔍 Find Friends
</NavLink>
```

---

## 👤 UserProfile Updates

**File:** `src/components/UserProfile.tsx`

**Add FollowButton to user profiles:**

```tsx
import FollowButton from './FollowButton';
import { useAuth } from '../contexts/AuthContext';

function UserProfile() {
  const { user } = useAuth();
  const { userId } = useParams(); // from react-router-dom
  
  return (
    <div className="user-profile">
      {/* User header */}
      <div className="profile-header">
        <img src={avatar} alt={username} />
        <h1>{username}</h1>
        
        {/* Add follow button */}
        <FollowButton userId={userId} />
      </div>
      
      {/* Stats */}
      <div className="stats">
        <div>
          <strong>{followerCount}</strong> Followers
        </div>
        <div>
          <strong>{followingCount}</strong> Following
        </div>
        <div>
          <strong>{pomodoroCount}</strong> Pomodoros
        </div>
      </div>
      
      {/* User's pomodoros (if following or self) */}
    </div>
  );
}
```

**Stats to fetch:**
- Follower count: `SELECT COUNT(*) FROM follows WHERE following_id = userId`
- Following count: `SELECT COUNT(*) FROM follows WHERE follower_id = userId`
- Total pomodoros: `SELECT COUNT(*) FROM pomodoros WHERE user_id = userId AND completed = true`

---

## 🎨 Styling Considerations

### Tailwind Classes

The new components use inline styles for portability. To match your app's design:

**Option 1: Keep inline styles**
- Works out of the box
- Consistent across components
- Easy to customize

**Option 2: Convert to Tailwind**
- Extract styles to className props
- Use your existing design tokens
- Better performance

**Example conversion:**
```tsx
{/* Inline style */}
<button style={{ padding: '8px 16px', borderRadius: '20px' }}>
  Follow
</button>

{/* Tailwind classes */}
<button className="px-4 py-2 rounded-full bg-blue-500 text-white">
  Follow
</button>
```

---

## 🧩 Step-by-Step Integration

### Quick Start (15 minutes)

**1. Add routes (Home.tsx):**
```bash
# Edit src/container/Home.tsx
# Add imports and routes as shown in Option A above
```

**2. Add navigation links (Sidebar.tsx):**
```tsx
{/* After Home link, add: */}
<NavLink to="/discover" className={navLinkClass}>
  🔍 Find Friends
</NavLink>
<NavLink to="/leaderboard" className={navLinkClass}>
  🏆 Leaderboard
</NavLink>
```

**3. Test it:**
```bash
npm run dev
# Navigate to http://localhost:5173/discover
# Navigate to http://localhost:5173/leaderboard
```

**4. Add FollowButton to UserProfile:**
```tsx
import { FollowButton } from '../components';

{/* In profile header */}
<FollowButton userId={userId} />
```

---

## 🧪 Testing After Integration

**Checklist:**

- [ ] `/discover` page loads and shows search
- [ ] `/leaderboard` page loads with tabs
- [ ] Can switch between Friends/Global tabs
- [ ] FollowButton appears on user profiles
- [ ] Following a user updates counts
- [ ] Feed updates after following
- [ ] Navigation works on mobile
- [ ] No console errors

---

## 🚧 Potential Issues

### Issue 1: TypeScript Errors

**Error:** `Cannot find module 'UserSearch'`

**Fix:**
```tsx
// Make sure imports are correct
import { UserSearch, LeaderboardTabs } from "../components";

// Or individual imports
import UserSearch from "../components/UserSearch";
```

---

### Issue 2: Routing Doesn't Work

**Error:** Page not found or routes conflict

**Fix:**
```tsx
// Make sure new routes come BEFORE the wildcard route
<Route path="/discover" element={<UserSearch />} />
<Route path="/leaderboard" element={<LeaderboardTabs />} />
<Route path="/*" element={<DoroWrapper user={user} />} />  {/* Last! */}
```

---

### Issue 3: Leaderboard Functions Missing

**Error:** `function get_global_leaderboard() does not exist`

**Fix:**
- Check that migration files 4 and 5 are applied
- Run: `SELECT * FROM pg_proc WHERE proname LIKE '%leaderboard%';`
- If missing, re-run migration: `supabase/migrations/20241213000004_leaderboard_functions.sql`

---

## 📱 Mobile Responsiveness

**New components are responsive by default, but test:**

1. Sidebar navigation on mobile
2. Leaderboard tabs on small screens
3. Search input on mobile
4. Follow button doesn't break layout

**Use Chrome DevTools device emulation to test**

---

## ✅ Integration Complete When:

- [ ] Routes added and working
- [ ] Navigation links in sidebar
- [ ] FollowButton on user profiles
- [ ] All pages render without errors
- [ ] TypeScript compiles successfully
- [ ] Mobile layout works

---

## 🚀 Optional Enhancements

### 1. Animations

Add smooth transitions:
```tsx
<div className="transition-all duration-200 hover:scale-105">
  {/* Content */}
</div>
```

### 2. Loading States

Improve UX while fetching:
```tsx
{loading ? <Spinner /> : <UserList />}
```

### 3. Error Handling

Show friendly errors:
```tsx
{error && <ErrorMessage>{error.message}</ErrorMessage>}
```

### 4. Empty States

Better messaging when no data:
```tsx
{users.length === 0 && (
  <EmptyState>
    No users found. Try following someone!
  </EmptyState>
)}
```

---

**Integration Status:** 🟡 Ready to begin  
**Estimated Time:** 15-30 minutes  
**Difficulty:** Easy
