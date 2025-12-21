# Followers/Following System & Notifications Design

Last updated: December 21, 2024

## 📋 Current State Analysis

Looking at the codebase:

- ✅ Basic following system (`follows` table)
- ✅ `FollowButton` component
- ✅ Privacy columns in users table (`privacy_setting`, `require_follow_approval`)
- ✅ RLS policies for content visibility
- ❌ **Missing**: Follow requests table
- ❌ **Missing**: Followers/Following list UI
- ❌ **Missing**: Follow request approval UI
- ❌ **Missing**: Persistent notification banner

## 🎯 Proposed Design

### 1. Privacy Model

```typescript
// Two-tier privacy system
type PrivacySetting = "public" | "private";
type ApprovalSetting = boolean; // require_follow_approval

// User states:
// 1. Public + Auto-approve (default) - Twitter-like
// 2. Public + Require approval - discoverable but gated
// 3. Private + Auto-approve - hidden from search/leaderboard
// 4. Private + Require approval - maximum privacy
```

**Recommendation**: Start with just `require_follow_approval` (simpler). Keep `privacy_setting` for future Phase 2.

### 2. Database Schema

#### Follow Requests Table

```sql
-- Follow requests table for approval workflow
CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CONSTRAINT no_self_request CHECK (requester_id != target_id)
);

-- Indexes for performance
CREATE INDEX idx_follow_requests_target ON follow_requests(target_id, status);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id, status);

-- RLS policies
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests (sent or received)
CREATE POLICY "Users can view own follow requests"
  ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Users can create follow requests
CREATE POLICY "Users can create follow requests"
  ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Only target can update requests (approve/reject)
CREATE POLICY "Target can update follow requests"
  ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- Function to get pending follow request count
CREATE OR REPLACE FUNCTION get_pending_follow_requests_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM follow_requests
    WHERE target_id = user_id
      AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### 3. Query Functions

Add to `src/lib/queries.ts`:

```typescript
// ============================================
// Follow Requests Functions
// ============================================

export async function getPendingFollowRequestsCount(userId: string) {
  const { data, error } = await supabase.rpc(
    "get_pending_follow_requests_count",
    {
      user_id: userId,
    }
  );
  return { count: data || 0, error };
}

export async function getPendingFollowRequests(userId: string) {
  const { data, error } = await supabase
    .from("follow_requests")
    .select(
      `
      id,
      requester_id,
      created_at,
      users:requester_id (
        id,
        user_name,
        avatar_url
      )
    `
    )
    .eq("target_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function approveFollowRequest(requestId: string, userId: string) {
  // Get request details
  const { data: request, error: fetchError } = await supabase
    .from("follow_requests")
    .select("requester_id, target_id")
    .eq("id", requestId)
    .eq("target_id", userId)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    return { error: fetchError || new Error("Request not found") };
  }

  // Create the follow relationship
  const { error: followError } = await supabase.from("follows").insert({
    follower_id: request.requester_id,
    following_id: request.target_id,
  });

  if (followError) return { error: followError };

  // Mark request as approved
  const { error: updateError } = await supabase
    .from("follow_requests")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return { error: updateError };
}

export async function rejectFollowRequest(requestId: string, userId: string) {
  const { error } = await supabase
    .from("follow_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("target_id", userId)
    .eq("status", "pending");

  return { error };
}

// ============================================
// Followers/Following Lists (Paginated)
// ============================================

export async function getFollowersList(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("follows")
    .select(
      `
      follower_id,
      created_at,
      users:follower_id (
        id,
        user_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
}

export async function getFollowingList(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("follows")
    .select(
      `
      following_id,
      created_at,
      users:following_id (
        id,
        user_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
}
```

### 4. Components to Create

#### A. FollowersModal Component

Create `src/components/FollowersModal.tsx` - A modal showing paginated lists of followers and following with tabs.

**Key features:**

- Tabbed interface (Followers / Following)
- Pagination (20 per page)
- Avatar + username display
- Links to user profiles
- Follow/unfollow buttons (when viewing own profile)

#### B. FollowRequestsBanner Component

Create `src/components/FollowRequestsBanner.tsx` - A persistent banner at the top of all pages (except create-doro).

**Key features:**

- Shows count of pending follow requests
- Sticky positioning (top of page)
- Clickable to navigate to user profile
- Auto-hides when no pending requests
- Polls every 30 seconds for updates

#### C. PrivacySettings Component

Create `src/components/PrivacySettings.tsx` - A settings page for privacy controls.

**Key features:**

- Toggle for `require_follow_approval`
- Clear explanation of what the setting does
- Future-ready for additional privacy settings

#### D. Update FollowButton Component

Modify `src/components/FollowButton.tsx` to handle three states:

1. **Following** - Can unfollow
2. **Requested** - Follow request pending (disabled)
3. **Follow** - Can send follow request or instantly follow

**Logic:**

```typescript
if (requiresApproval) {
  // Create follow_request
  await supabase.from("follow_requests").insert({
    requester_id: currentUser.id,
    target_id: userId,
  });
} else {
  // Instant follow
  await followUser(currentUser.id, userId);
}
```

#### E. Update UserProfile Component

Modify `src/components/UserProfile.tsx` to add:

- Followers/Following count display (clickable)
- Follow requests section (only visible on own profile)
- Approve/Reject buttons for each request
- Integration with FollowersModal

### 5. Integration Points

#### App Layout (Home.tsx)

Add `FollowRequestsBanner` to the main layout:

```typescript
<div className="flex-1 h-screen overflow-y-scroll">
  <FollowRequestsBanner />
  {/* existing routes */}
</div>
```

#### User Profile

Add at top of profile:

```
[Followers: 123] [Following: 45]  <- Clickable stats
```

Add below header (own profile only):

```
┌─────────────────────────────────────┐
│ Follow Requests (3)                  │
│ [@user1] [Accept] [Decline]         │
│ [@user2] [Accept] [Decline]         │
│ [@user3] [Accept] [Decline]         │
└─────────────────────────────────────┘
```

### 6. User Flows

#### Flow 1: User Follows Public Profile (Auto-Approve)

1. User A clicks "Follow" on User B's profile
2. User B has `require_follow_approval = false`
3. System immediately creates `follows` record
4. User A sees "Following" button
5. User B sees User A in followers list

#### Flow 2: User Follows Private Profile (Requires Approval)

1. User A clicks "Follow" on User B's profile
2. User B has `require_follow_approval = true`
3. System creates `follow_requests` record with `status = 'pending'`
4. User A sees "Requested" button (disabled)
5. User B sees banner: "🔔 You have 1 pending follow request"
6. User B navigates to profile, sees request section
7. User B clicks "Accept":
   - Creates `follows` record
   - Updates request `status = 'approved'`
   - User A can now see User B's doros
8. OR User B clicks "Decline":
   - Updates request `status = 'rejected'`
   - No follow relationship created

#### Flow 3: User Views Followers/Following

1. User clicks on "Followers" or "Following" count
2. Modal opens with tabbed interface
3. Each tab shows paginated list (20 per page)
4. Clicking username navigates to profile
5. If viewing own profile in "Following" tab, can unfollow

### 7. RLS Policy Updates

Ensure content visibility respects follow relationships:

```sql
-- Pomodoros visible to followers (if user requires approval)
CREATE POLICY "Pomodoros visible to followers"
  ON pomodoros FOR SELECT
  USING (
    -- Own pomodoros
    user_id = auth.uid()
    OR
    -- Public users OR following relationship exists
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = pomodoros.user_id
      AND (
        users.require_follow_approval = false
        OR
        EXISTS (
          SELECT 1 FROM follows
          WHERE follows.follower_id = auth.uid()
          AND follows.following_id = pomodoros.user_id
        )
      )
    )
  );
```

## 📧 Email Notifications - Recommendation

### Implement Later (Phase 2)

**Why wait:**

- In-app notifications are faster and sufficient for MVP
- Email delivery adds complexity (SPF/DKIM, deliverability)
- Need to handle bounces/spam complaints
- User preference UI required
- GDPR compliance considerations
- Can validate demand first with in-app notifications

**When to implement (2-4 weeks after Phase 1):**

- Use Supabase Edge Functions + SendGrid/Resend
- Add configurable email preferences
- Support digest mode (daily summary vs. instant)
- Include unsubscribe links
- Track email open rates

**Prepare now:**
Add `notification_preferences` column to users table:

```sql
ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"email_follow_requests": false, "email_likes": false, "email_comments": false}'::jsonb;
```

## 🚀 Implementation Order

### Phase 1: Core Follow Requests (Week 1)

1. **Database** (30 min)

   - [ ] Create `follow_requests` migration
   - [ ] Add RLS policies
   - [ ] Add helper functions
   - [ ] Add notification_preferences column (for future)

2. **Queries** (20 min)

   - [ ] Add follow request functions to `src/lib/queries.ts`
   - [ ] Add paginated followers/following functions

3. **Components** (2-3 hours)

   - [ ] Update `FollowButton` with request logic
   - [ ] Create `FollowersModal`
   - [ ] Create `FollowRequestsBanner`
   - [ ] Create `PrivacySettings`
   - [ ] Update `UserProfile` with stats + requests

4. **Integration** (30 min)

   - [ ] Add banner to `src/container/Home.tsx`
   - [ ] Add privacy route
   - [ ] Export new components

5. **Testing** (1 hour)
   - [ ] Test with 2 accounts
   - [ ] Verify RLS policies
   - [ ] Check pagination
   - [ ] Test approval/rejection flow

### Phase 2: Enhancements (Future)

- [ ] Email notifications
- [ ] Real-time notifications (Supabase Realtime)
- [ ] Notification preferences page
- [ ] Block/mute users
- [ ] Remove follower (force unfollow)
- [ ] Notification history
- [ ] Like/comment notifications

## ✅ Implementation Checklist

### Database Layer

- [x] Create follow_requests migration file
- [x] Add indexes for performance
- [x] Create RLS policies
- [x] Add get_pending_follow_requests_count function
- [ ] Test policies with different users
- [x] Add notification_preferences column

### Query Layer

- [x] getPendingFollowRequestsCount()
- [x] getPendingFollowRequests()
- [x] approveFollowRequest()
- [x] rejectFollowRequest()
- [x] getFollowersList() with pagination
- [x] getFollowingList() with pagination

### Component Layer

- [x] FollowersModal.tsx
- [x] FollowRequestsBanner.tsx
- [x] PrivacySettings.tsx
- [x] Update FollowButton.tsx
- [x] Update UserProfile.tsx
- [x] Export all new components

### Integration Layer

- [x] Add FollowRequestsBanner to Home.tsx
- [x] Add privacy settings route
- [ ] Update navigation if needed
- [x] Add URL param support for ?tab=requests

### Testing

- [ ] Two-user approval flow
- [ ] Pagination edge cases
- [ ] RLS policy verification
- [ ] Banner visibility logic
- [ ] Modal open/close behavior
- [ ] Privacy toggle functionality

## 🎨 Design Considerations

### Banner Design

- **Color**: Blue (#007bff) for visibility without being alarming
- **Position**: Sticky top, below navbar
- **Behavior**: Click navigates to profile with ?tab=requests
- **Hide on**: Create Doro page (user needs focus)

### Modal Design

- **Size**: Max-width 500px, 80vh height
- **Tabs**: Underline active tab
- **Pagination**: Simple prev/next with page count
- **Empty state**: Friendly message

### Privacy Settings

- **Toggle**: iOS-style switch
- **Explanation**: Clear description of what happens
- **Note**: Explain profile vs. content visibility

### Follow States

- **Following**: White background, gray text
- **Requested**: White background, blue text/border, disabled
- **Follow**: Blue background, white text

## 🔐 Security Considerations

1. **RLS Policies**: Ensure users can only:

   - Create requests they are sending
   - View requests they sent or received
   - Update only requests sent to them

2. **Race Conditions**: Handle duplicate requests with UNIQUE constraint

3. **Data Privacy**: Don't leak follower lists of private users

4. **Rate Limiting**: Consider adding rate limits for follow requests (future)

5. **Spam Prevention**: Consider max pending requests per user (future)

## 📊 Analytics to Track (Future)

- Follow request conversion rate (approved vs. rejected)
- Time to approve/reject
- Most requested users
- Privacy setting adoption
- Banner click-through rate

## 🐛 Known Edge Cases

1. **User deletes account**: CASCADE handles cleanup
2. **Duplicate requests**: UNIQUE constraint prevents
3. **Request then unfollow**: Need to handle gracefully
4. **Private → Public switch**: Existing followers remain, new are auto-approved
5. **Approve then re-request**: Should show as following
