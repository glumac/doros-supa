# Doros Supabase Migration Plan

## Source Repository

**GitHub Repository**: [glumac/doros2](https://github.com/glumac/doros2)

This migration plan is based on the existing Crush Quest (doros2) application currently using Sanity CMS.

## Reference Projects

**Supabase + React Reference**: [shwosner/realtime-chat-supabase-react](https://github.com/shwosner/realtime-chat-supabase-react)

This is a real-time chat application built with React and Supabase. Use this as a reference for:

- React + Supabase client setup patterns
- Authentication implementation examples
- Real-time subscriptions with Supabase Realtime
- TypeScript integration with Supabase
- Component structure and best practices

## Overview

Migrate Crush Quest (doros2) from Sanity CMS to Supabase with a privacy-focused friends/following system while preserving core Pomodoro timer functionality.

**Key Changes:**

- Backend: Sanity → Supabase (PostgreSQL + Storage)
- Privacy: Public feed → Friends-only feed with following system
- Auth: Keep Google OAuth, integrate with Supabase Auth
- Assets: Sanity assets → Supabase Storage

---

## 1. Backend Migration: Sanity → Supabase

### 1.1 Database Schema (PostgreSQL)

**Core Tables:**

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'private')),
  require_follow_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pomodoros (main content)
CREATE TABLE pomodoros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  launch_at TIMESTAMPTZ NOT NULL,
  task TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pomodoro_id UUID NOT NULL REFERENCES pomodoros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pomodoro_id, user_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pomodoro_id UUID NOT NULL REFERENCES pomodoros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Following/Friends system
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
```

**Indexes for Performance:**

```sql
CREATE INDEX idx_pomodoros_user_id ON pomodoros(user_id);
CREATE INDEX idx_pomodoros_completed ON pomodoros(completed);
CREATE INDEX idx_pomodoros_created_at ON pomodoros(created_at DESC);
CREATE INDEX idx_likes_pomodoro_id ON likes(pomodoro_id);
CREATE INDEX idx_comments_pomodoro_id ON comments(pomodoro_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Composite index for feed queries
CREATE INDEX idx_pomodoros_completed_created ON pomodoros(completed, created_at DESC);

-- Text search on task/notes
CREATE INDEX idx_pomodoros_task_search ON pomodoros USING gin(to_tsvector('english', task));
CREATE INDEX idx_pomodoros_notes_search ON pomodoros USING gin(to_tsvector('english', notes));
```

### 1.2 Row-Level Security (RLS) Policies

Privacy model: Users can only see pomodoros from people they follow (and their own).

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoros ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Pomodoros: Only visible to creator and their followers
CREATE POLICY "Users can view own pomodoros"
  ON pomodoros FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view followed users' pomodoros"
  ON pomodoros FOR SELECT
  USING (
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own pomodoros"
  ON pomodoros FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pomodoros"
  ON pomodoros FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own pomodoros"
  ON pomodoros FOR DELETE
  USING (user_id = auth.uid());

-- Likes: Can like visible pomodoros
CREATE POLICY "Users can view likes on visible pomodoros"
  ON likes FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros) -- Will respect pomodoro RLS
  );

CREATE POLICY "Users can insert own likes"
  ON likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (user_id = auth.uid());

-- Comments: Similar to likes
CREATE POLICY "Users can view comments on visible pomodoros"
  ON comments FOR SELECT
  USING (
    pomodoro_id IN (SELECT id FROM pomodoros)
  );

CREATE POLICY "Users can insert own comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Follows: Users can manage their own follows
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (follower_id = auth.uid());
```

### 1.3 Database Functions & Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pomodoros_updated_at BEFORE UPDATE ON pomodoros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, user_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1.4 Supabase Storage Setup

**Bucket Configuration:**

```javascript
// Create storage bucket for pomodoro images
// Run once in Supabase dashboard or via migration
supabase.storage.createBucket("pomodoro-images", {
  public: false, // Private bucket, access controlled
  fileSizeLimit: 5242880, // 5MB max
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/heic",
  ],
});
```

**Storage RLS Policies:**

```sql
-- Users can upload images
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pomodoro-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read images from followed users
CREATE POLICY "Users can read accessible images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pomodoro-images' AND (
      -- Own images
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Followed users' images
      (storage.foldername(name))[1] IN (
        SELECT following_id::text FROM follows WHERE follower_id = auth.uid()
      )
    )
  );

-- Users can delete own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pomodoro-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 2. Data Migration from Sanity

### 2.1 Migration Strategy

**Two-phase approach:**

1. **Export** all data from Sanity via their API
2. **Transform & Import** into Supabase with proper UUID mapping

### 2.2 Export Script (TypeScript)

**Setup for running TypeScript migration scripts:**

```bash
# Install dependencies for migration scripts
npm install -D tsx @types/node

# Add script to package.json
"scripts": {
  "migrate:export": "tsx scripts/export-from-sanity.ts",
  "migrate:download": "tsx scripts/download-sanity-images.ts",
  "migrate:import": "tsx scripts/import-to-supabase.ts"
}
```

```typescript
// scripts/export-from-sanity.ts
import sanityClient from "@sanity/client";
import fs from "fs/promises";

interface SanityUser {
  _id: string;
  email: string;
  userName: string;
  image?: string;
}

interface SanityPomodoro {
  _id: string;
  launchAt: string;
  task: string;
  notes?: string;
  completed: boolean;
  userId: string;
  imageUrl?: string;
  _createdAt: string;
  _updatedAt: string;
}

interface SanityLike {
  userId: string;
  _key: string;
}

interface SanityComment {
  userId: string;
  commentText: string;
  _key: string;
}

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2021-11-16",
  useCdn: false,
  token: process.env.SANITY_TOKEN!,
});

async function exportData() {
  console.log("Exporting users...");
  const users = await client.fetch<SanityUser[]>('*[_type == "user"]');

  console.log("Exporting pomodoros...");
  const pomodoros = await client.fetch<SanityPomodoro[]>(`
    *[_type == "pomodoro"] {
      _id,
      launchAt,
      task,
      notes,
      completed,
      userId,
      "imageUrl": image.asset->url,
      _createdAt,
      _updatedAt
    }
  `);

  console.log("Exporting likes...");
  const likes = await client.fetch<
    Array<{ _id: string; likes: SanityLike[] }>
  >(`
    *[_type == "pomodoro"] {
      _id,
      "likes": likes[]{ userId, _key }
    }[count(likes) > 0]
  `);

  console.log("Exporting comments...");
  const comments = await client.fetch<
    Array<{ _id: string; comments: SanityComment[] }>
  >(`
    *[_type == "pomodoro"] {
      _id,
      "comments": comments[]{ userId, commentText, _key }
    }[count(comments) > 0]
  `);

  // Save to JSON files
  await fs.mkdir("migration-data", { recursive: true });
  await fs.writeFile(
    "migration-data/users.json",
    JSON.stringify(users, null, 2)
  );
  await fs.writeFile(
    "migration-data/pomodoros.json",
    JSON.stringify(pomodoros, null, 2)
  );
  await fs.writeFile(
    "migration-data/likes.json",
    JSON.stringify(likes, null, 2)
  );
  await fs.writeFile(
    "migration-data/comments.json",
    JSON.stringify(comments, null, 2)
  );

  console.log(`Exported:
    - ${users.length} users
    - ${pomodoros.length} pomodoros
    - ${likes.reduce((sum, p) => sum + p.likes.length, 0)} likes
    - ${comments.reduce((sum, p) => sum + p.comments.length, 0)} comments
  `);
}

exportData();
```

### 2.3 Download Images

```typescript
// scripts/download-sanity-images.ts
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import https from "https";

interface Pomodoro {
  _id: string;
  imageUrl?: string;
  [key: string]: any;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const file = createWriteStream(filepath);
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", reject);
  });
}

async function downloadAllImages() {
  const pomodorosData = await fs.readFile(
    "migration-data/pomodoros.json",
    "utf8"
  );
  const pomodoros: Pomodoro[] = JSON.parse(pomodorosData);

  await fs.mkdir("migration-data/images", { recursive: true });

  for (const pom of pomodoros) {
    if (pom.imageUrl) {
      const filename = `${pom._id}.jpg`;
      const filepath = path.join("migration-data/images", filename);
      console.log(`Downloading ${filename}...`);
      await downloadImage(pom.imageUrl, filepath);
    }
  }
}

downloadAllImages();
```

### 2.4 Import to Supabase

```typescript
// scripts/import-to-supabase.ts
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { Database } from "../src/types/supabase";

interface SanityUser {
  _id: string;
  email: string;
  userName: string;
  image?: string;
}

interface SanityPomodoro {
  _id: string;
  userId: string;
  launchAt: string;
  task: string;
  notes?: string;
  completed: boolean;
  imageUrl?: string;
  _createdAt: string;
  _updatedAt: string;
}

interface SanityLike {
  userId: string;
  _key: string;
}

interface SanityComment {
  userId: string;
  commentText: string;
  _key: string;
}

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for migration
);

async function importData() {
  // 1. Import users (create auth users first)
  const usersData = await fs.readFile("migration-data/users.json", "utf8");
  const users: SanityUser[] = JSON.parse(usersData);
  const userIdMap = new Map<string, string>(); // Sanity ID → Supabase UUID

  for (const user of users) {
    // Create auth user (email/password users will need to reset password)
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        name: user.userName,
        avatar_url: user.image,
      },
    });

    if (error) {
      console.error(`Error creating user ${user.email}:`, error);
      continue;
    }

    userIdMap.set(user._id, authUser.user.id);
    console.log(`Created user: ${user.email} → ${authUser.user.id}`);
  }

  // 2. Import pomodoros
  const pomodorosData = await fs.readFile(
    "migration-data/pomodoros.json",
    "utf8"
  );
  const pomodoros: SanityPomodoro[] = JSON.parse(pomodorosData);
  const pomIdMap = new Map<string, string>(); // Sanity ID → Supabase UUID

  for (const pom of pomodoros) {
    const supabaseUserId = userIdMap.get(pom.userId);
    if (!supabaseUserId) {
      console.error(`User not found for pomodoro ${pom._id}`);
      continue;
    }

    // Upload image if exists
    let imageUrl = null;
    if (pom.imageUrl) {
      const imagePath = path.join("migration-data/images", `${pom._id}.jpg`);
      try {
        const imageFile = await fs.readFile(imagePath);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("pomodoro-images")
          .upload(`${supabaseUserId}/${pom._id}.jpg`, imageFile, {
            contentType: "image/jpeg",
          });

        if (!uploadError) {
          imageUrl = uploadData.path;
        }
      } catch (err) {
        console.error(`Error uploading image for ${pom._id}:`, err);
      }
    }

    // Insert pomodoro
    const { data: newPom, error } = await supabase
      .from("pomodoros")
      .insert({
        user_id: supabaseUserId,
        launch_at: pom.launchAt,
        task: pom.task,
        notes: pom.notes,
        completed: pom.completed,
        image_url: imageUrl,
        created_at: pom._createdAt,
        updated_at: pom._updatedAt,
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating pomodoro ${pom._id}:`, error);
      continue;
    }

    pomIdMap.set(pom._id, newPom.id);
    console.log(`Created pomodoro: ${pom._id} → ${newPom.id}`);
  }

  // 3. Import likes
  const likesDataRaw = await fs.readFile("migration-data/likes.json", "utf8");
  const likesData: Array<{ _id: string; likes: SanityLike[] }> =
    JSON.parse(likesDataRaw);
  let likeCount = 0;

  for (const pomLikes of likesData) {
    const pomId = pomIdMap.get(pomLikes._id);
    if (!pomId) continue;

    for (const like of pomLikes.likes) {
      const userId = userIdMap.get(like.userId);
      if (!userId) continue;

      const { error } = await supabase
        .from("likes")
        .insert({ pomodoro_id: pomId, user_id: userId });

      if (!error) likeCount++;
    }
  }
  console.log(`Imported ${likeCount} likes`);

  // 4. Import comments
  const commentsDataRaw = await fs.readFile(
    "migration-data/comments.json",
    "utf8"
  );
  const commentsData: Array<{ _id: string; comments: SanityComment[] }> =
    JSON.parse(commentsDataRaw);
  let commentCount = 0;

  for (const pomComments of commentsData) {
    const pomId = pomIdMap.get(pomComments._id);
    if (!pomId) continue;

    for (const comment of pomComments.comments) {
      const userId = userIdMap.get(comment.userId);
      if (!userId) continue;

      const { error } = await supabase.from("comments").insert({
        pomodoro_id: pomId,
        user_id: userId,
        comment_text: comment.commentText,
      });

      if (!error) commentCount++;
    }
  }
  console.log(`Imported ${commentCount} comments`);
}

importData();
```

### 2.5 Migration Notes

- **User Passwords**: Since Sanity doesn't handle auth, migrated users will need to set passwords or re-authenticate with Google
- **Image URLs**: Transform Sanity CDN URLs to Supabase Storage URLs
- **Timestamps**: Preserve original `created_at` from Sanity
- **Data Validation**: Run validation queries after migration to ensure integrity
- **Rollback Plan**: Keep Sanity data intact until migration is verified

---

## 3. Friends/Following System Implementation

### 3.1 Following Model

**Design Decision**: Unidirectional following (like Twitter/Instagram)

- User A can follow User B without B's approval
- B doesn't need to follow back
- Feed shows pomodoros from users you follow (not mutual friends)

**Alternative**: Mutual friendship (like Facebook)

- Would require approval system
- More complex but stronger privacy
- Recommend starting with following, can add approval later

### 3.2 User Discovery

**How users find each other:**

1. **Global Leaderboard** - Shows all users ranked by completions

   - Displays: avatar, username, completion count
   - Does NOT show: individual pomodoros (unless you follow them)
   - Click on user → view profile with follow button

2. **User Search** - Search by username

   - Type-ahead search across all users
   - Shows matching profiles with avatars
   - Can follow directly from search results

3. **Engagement Discovery** - See who's active

   - Users who like/comment on visible pomodoros
   - Mutual followers suggestions
   - "Popular this week" section

4. **Invite System** (Optional)
   - Share personal referral link
   - Invite friends by email

**Privacy Model:**

- ✅ User profiles (name, avatar) are **public**
- ✅ Leaderboard stats (completion counts) are **public**
- ❌ Individual pomodoros are **private** (follow-only)
- ❌ Task details, notes, images are **private** (follow-only)

### 3.3 Frontend Components for Following

**New Components Needed:**

1. **`FollowButton.tsx`** - Follow/unfollow toggle
2. **`FollowersList.tsx`** - View followers
3. **`FollowingList.tsx`** - View following
4. **`UserSearch.tsx`** - Find users to follow by name
5. **`GlobalLeaderboard.tsx`** - All users ranked by completions
6. **`FriendsLeaderboard.tsx`** - Followed users only
7. **`UserProfileCard.tsx`** - Public profile preview
8. **`FriendsPage.tsx`** - Manage follows/followers (optional)

### 3.4 Modified Feed Logic

**Current Feed** (Sanity): Shows all completed pomodoros

**New Feed** (Supabase): Shows only:

- Your own pomodoros
- Pomodoros from users you follow

**User Profiles** (Public but limited):

- Anyone can view: name, avatar, total completion count
- Only followers can see: individual pomodoros, task details, notes, images

```javascript
// Example feed query
const { data: feedPomodoros } = await supabase
  .from("pomodoros")
  .select(
    `
    *,
    users:user_id (id, user_name, avatar_url),
    likes (id, user_id, users:user_id (id, user_name)),
    comments (id, comment_text, user_id, users:user_id (id, user_name))
  `
  )
  .eq("completed", true)
  .order("created_at", { ascending: false })
  .limit(20);
// RLS automatically filters to visible pomodoros
```

### 3.5 Leaderboard Changes

**Current**: Shows all users globally (all pomodoros visible)

**New**: Dual leaderboard system

#### Global Leaderboard

- **Shows**: All users ranked by total completions this week
- **Visible to**: Everyone (public)
- **Displays**: Avatar, username, completion count
- **Privacy**: Does NOT show individual pomodoros
- **Purpose**: User discovery, motivation, friendly competition
- **Click on user**: Opens public profile with follow button

#### Friends Leaderboard

- **Shows**: Only users you follow (+ yourself)
- **Visible to**: Individual user (personalized)
- **Displays**: Avatar, username, completion count
- **Privacy**: Can click through to see their actual pomodoros
- **Purpose**: Accountability with close friends, detailed tracking

**Implementation:**

```typescript
// Toggle between views
<Tabs>
  <Tab label="Friends" />
  <Tab label="Global" />
</Tabs>
```

**Default View**: Friends leaderboard (more relevant to user)

### 3.6 Privacy Settings & Follow Approval (Extensible Design)

**Implemented Now (Phase 1):**

Two privacy settings added to users table:

1. **`privacy_setting`** - Controls profile/content visibility:

   - **`public`** (default): Anyone can see pomodoros without following
   - **`private`**: Only approved followers can see pomodoros

2. **`require_follow_approval`** - Controls follow workflow:
   - **`false`** (default): Instant follow (current behavior)
   - **`true`**: Requires approval before follow is confirmed

**Current Behavior (Phase 1):**

- All users default to `public` + instant follow
- Global leaderboard always shows all users (discoverable)
- UI doesn't expose settings yet (added for future extensibility)

**Future Implementation (Phase 2 - Follow Approval System):**

When adding approval workflow, create this table:

```sql
-- Follow requests table (add when implementing approval)
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

CREATE INDEX idx_follow_requests_target ON follow_requests(target_id, status);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id, status);
```

**Follow Approval Logic (Phase 2):**

```typescript
// Modified follow function with approval check
export async function followUser(myUserId: string, theirUserId: string) {
  // Check if target requires approval
  const { data: targetUser } = await supabase
    .from("users")
    .select("require_follow_approval")
    .eq("id", theirUserId)
    .single();

  if (targetUser?.require_follow_approval) {
    // Create follow request instead
    const { error } = await supabase
      .from("follow_requests")
      .insert({ requester_id: myUserId, target_id: theirUserId });
    return { pending: true, error };
  } else {
    // Instant follow (current behavior)
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: myUserId, following_id: theirUserId });
    return { pending: false, error };
  }
}

// Approve follow request
export async function approveFollowRequest(
  requestId: string,
  approverId: string
) {
  // Get request details
  const { data: request } = await supabase
    .from("follow_requests")
    .select("*")
    .eq("id", requestId)
    .eq("target_id", approverId) // Ensure only target can approve
    .eq("status", "pending")
    .single();

  if (!request) return { error: new Error("Request not found") };

  // Create actual follow
  const { error: followError } = await supabase.from("follows").insert({
    follower_id: request.requester_id,
    following_id: request.target_id,
  });

  if (followError) return { error: followError };

  // Mark request as approved
  const { error: updateError } = await supabase
    .from("follow_requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  return { error: updateError };
}

// Reject follow request
export async function rejectFollowRequest(
  requestId: string,
  rejecterId: string
) {
  const { error } = await supabase
    .from("follow_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("target_id", rejecterId)
    .eq("status", "pending");

  return { error };
}
```

**UI Components for Phase 2:**

- `FollowRequestsModal.tsx` - View pending requests
- `FollowRequestButton.tsx` - Shows "Requested" state
- `PrivacySettingsPage.tsx` - Toggle privacy options
- Notification system for new requests

**Privacy Setting Effects (Phase 2):**

| Setting   | Global Leaderboard  | Profile Viewable | Pomodoros Viewable |
| --------- | ------------------- | ---------------- | ------------------ |
| `public`  | ✅ Yes              | ✅ Anyone        | ✅ Anyone          |
| `private` | ✅ Yes (stats only) | ✅ Anyone        | ❌ Followers only  |

**Note**: Global leaderboard always shows all users for discoverability, regardless of privacy setting. Privacy only affects content visibility.

**Migration Strategy:**

1. **Phase 1 (Now)**: Add columns with defaults, don't expose in UI
2. **Phase 2 (Later)**: Add follow_requests table, implement approval logic, add settings UI
3. **Zero breaking changes**: Existing instant-follow behavior preserved until users opt-in to approval

---

## 4. Authentication: Google OAuth with Supabase

### 4.1 Why Google Auth Works Well

**✅ Compatible**: Supabase Auth natively supports Google OAuth
**✅ Seamless Migration**: Can use same Google OAuth client ID
**✅ User Experience**: No disruption to login flow
**✅ Secure**: Supabase handles token management, no localStorage hacks needed

**No problems with keeping Google OAuth** - it's actually the recommended approach! Supabase has first-class Google OAuth support.

### 4.2 Setup Process

**1. Configure Google OAuth in Supabase Dashboard:**

- Go to Authentication > Providers > Google
- Enable Google provider
- Add OAuth credentials (client ID & secret from Google Console)
- Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

**2. Update Google Console:**

- Add Supabase callback URL to authorized redirect URIs
- Can keep same OAuth app or create new one

**3. Frontend Implementation (TypeScript):**

```typescript
// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Login component
function Login() {
  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) console.error("Login error:", error);
  };

  return <button onClick={handleGoogleLogin}>Sign in with Google</button>;
}

// Session management
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  // Listen for auth changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);

// Logout
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate("/login");
};
```

### 4.3 Migration Path for Existing Users

**Problem**: Existing users have Sanity user docs with Google `sub` as ID

**Solution**:

1. During data migration, create Supabase Auth users with same emails
2. On first login post-migration:
   - User signs in with Google via Supabase
   - Backend matches by email to migrated profile
   - Link Supabase auth.user.id to existing profile
3. Send email notification about migration

**Optional**: Add legacy ID mapping table during transition period

### 4.4 Advantages Over Current Approach

**Current Issues** (localStorage + Sanity):

- ❌ Auth tokens in localStorage (security risk)
- ❌ Manual user management
- ❌ No session refresh
- ❌ No built-in token expiration

**Supabase Auth Benefits**:

- ✅ Secure HTTP-only cookies (optional)
- ✅ Automatic token refresh
- ✅ Built-in session management
- ✅ RLS automatically uses auth.uid()
- ✅ No manual user CRUD (handled by triggers)

---

## 5. Frontend Changes Required

### 5.0 Vite + TypeScript Project Setup

**Initialize Vite Project:**

```bash
# Create new Vite project with React + TypeScript
npm create vite@latest crush-quest-vite -- --template react-ts

# Or if migrating existing project, add TypeScript
npm install -D typescript @types/react @types/react-dom
```

**Key Vite Configuration (`vite.config.ts`):**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
});
```

**TypeScript Configuration (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Update `package.json` scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

**Install dependencies:**

```bash
# Core dependencies
npm install @supabase/supabase-js
npm install react-router-dom

# Development dependencies
npm install -D @types/node

# Optional: UI libraries
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 5.1 Replace Sanity Client

**Remove:**

- `@sanity/client`
- `@sanity/image-url`
- `src/client.js`

**Add:**

- `@supabase/supabase-js`
- Create `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Generate TypeScript types:**

```bash
# Generate types from your Supabase schema
npx supabase gen types typescript --project-id "your-project-id" > src/types/supabase.ts
```

### 5.2 Rewrite Data Queries

**Convert GROQ → Supabase Queries (TypeScript):**

```typescript
// src/lib/queries.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../types/supabase";

type Pomodoro = Database["public"]["Tables"]["pomodoros"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

// Feed query
export async function getFeed(limit = 20) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name)),
      comments (id, comment_text, user_id, users:user_id (id, user_name))
    `
    )
    .eq("completed", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
}

// Pomodoro detail query
export async function getPomodoroDetail(id: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name, avatar_url)),
      comments (id, comment_text, user_id, created_at, users:user_id (id, user_name, avatar_url))
    `
    )
    .eq("id", id)
    .single();

  return { data, error };
}

// User profile query
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return { data, error };
}

// User's pomodoros query
export async function getUserPomodoros(userId: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name)),
      comments (id, comment_text, user_id, users:user_id (id, user_name))
    `
    )
    .eq("user_id", userId)
    .eq("completed", true)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Search query
export async function searchPomodoros(term: string) {
  const { data, error } = await supabase
    .from("pomodoros")
    .select("*, users:user_id (*)")
    .or(`task.ilike.%${term}%,notes.ilike.%${term}%`)
    .eq("completed", true)
    .order("created_at", { ascending: false });

  return { data, error };
}
```

**New Queries for Following:**

```typescript
// Get users I'm following
export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, users:following_id(*)")
    .eq("follower_id", userId);

  return { data, error };
}

// Get my followers
export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, users:follower_id(*)")
    .eq("following_id", userId);

  return { data, error };
}

// Check if following a user
export async function isFollowingUser(myUserId: string, theirUserId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", myUserId)
    .eq("following_id", theirUserId)
    .maybeSingle();

  return { isFollowing: !!data, error };
}

// Follow a user
export async function followUser(myUserId: string, theirUserId: string) {
  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: myUserId, following_id: theirUserId });

  return { data, error };
}

// Unfollow a user
export async function unfollowUser(myUserId: string, theirUserId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myUserId)
    .eq("following_id", theirUserId);

  return { error };
}

// Get global leaderboard
export async function getGlobalLeaderboard() {
  const { data, error } = await supabase.rpc("get_global_leaderboard");
  return { data, error };
}

// Get friends leaderboard
export async function getFriendsLeaderboard(userId: string) {
  const { data, error } = await supabase.rpc("get_friends_leaderboard", {
    user_id: userId,
  });
  return { data, error };
}

// Search users by name
export async function searchUsers(searchTerm: string, currentUserId: string) {
  const { data, error } = await supabase.rpc("search_users", {
    search_term: searchTerm,
    current_user_id: currentUserId,
  });
  return { data, error };
}

// Get public user profile
export async function getPublicUserProfile(
  userId: string,
  currentUserId: string | null
) {
  const { data, error } = await supabase.rpc("get_public_user_profile", {
    profile_user_id: userId,
    current_user_id: currentUserId,
  });
  return { data, error };
}
```

### 5.3 Image Upload Changes

**Old (Sanity):**

```javascript
const document = await client.assets.upload("image", file, {
  contentType: file.type,
  filename: file.name,
});
setImageAsset(document);
```

**New (Supabase Storage with TypeScript):**

```typescript
// src/lib/storage.ts
import { supabase } from "./supabaseClient";

export async function uploadPomodoroImage(file: File, userId: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("pomodoro-images")
    .upload(fileName, file, {
      contentType: file.type,
    });

  if (error) {
    console.error("Upload error:", error);
    return { imageUrl: null, error };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("pomodoro-images").getPublicUrl(fileName);

  return { imageUrl: publicUrl, error: null };
}

export async function deletePomodoroImage(imageUrl: string) {
  // Extract the file path from the URL
  const urlParts = imageUrl.split("/pomodoro-images/");
  if (urlParts.length < 2) return { error: new Error("Invalid image URL") };

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from("pomodoro-images")
    .remove([filePath]);

  return { error };
}
```

### 5.4 Component Updates

**Files requiring significant changes:**

- `Login.tsx` - Replace Google OAuth provider
- `Home.tsx` - Replace user fetch with Supabase auth session
- `CreateDoro.tsx` - Update save logic, image upload
- `Feed.tsx` - New feed query with RLS
- `DoroDetail.tsx` - Update mutations (likes/comments)
- `Doro.tsx` - Update like/comment handlers
- `UserProfile.tsx` - Add follow button, show follow stats
- `Sidebar.tsx` - Update leaderboard query (friends-only)
- `Navbar.tsx` - Use Supabase session
- `Search.tsx` - New search query

**New components to create:**

- `FollowButton.tsx`
- `FollowersModal.tsx`
- `FollowingModal.tsx`
- `UserSearch.tsx` - Search users by name globally
- `GlobalLeaderboard.tsx` - All users leaderboard
- `FriendsLeaderboard.tsx` - Followed users only
- `LeaderboardTabs.tsx` - Toggle between Global/Friends
- `PublicUserProfile.tsx` - View user stats without pomodoros
- `UserProfileCard.tsx` - Compact user preview
- `FriendsPage.tsx` (optional dedicated page)

**Example TypeScript Components:**

```typescript
// src/components/FollowButton.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { isFollowingUser, followUser, unfollowUser } from "../lib/queries";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export default function FollowButton({
  userId,
  className = "",
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userId !== user.id) {
      checkFollowStatus();
    }
  }, [user, userId]);

  async function checkFollowStatus() {
    if (!user) return;
    const { isFollowing: following } = await isFollowingUser(user.id, userId);
    setIsFollowing(following);
  }

  async function handleToggleFollow() {
    if (!user) return;
    setLoading(true);

    if (isFollowing) {
      await unfollowUser(user.id, userId);
      setIsFollowing(false);
    } else {
      await followUser(user.id, userId);
      setIsFollowing(true);
    }

    setLoading(false);
  }

  if (!user || userId === user.id) return null;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`follow-button ${isFollowing ? "following" : ""} ${className}`}
    >
      {loading ? "..." : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}
```

```typescript
// src/components/CreateDoro.tsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { uploadPomodoroImage } from "../lib/storage";

interface CreateDoroProps {
  onCreated?: () => void;
}

export default function CreateDoro({ onCreated }: CreateDoroProps) {
  const { user } = useAuth();
  const [task, setTask] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !task) return;

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (image) {
        const result = await uploadPomodoroImage(image, user.id);
        if (result.imageUrl) {
          imageUrl = result.imageUrl;
        }
      }

      // Create pomodoro
      const { error } = await supabase.from("pomodoros").insert({
        user_id: user.id,
        task,
        notes: notes || null,
        image_url: imageUrl,
        launch_at: new Date().toISOString(),
        completed: false,
      });

      if (error) throw error;

      // Reset form
      setTask("");
      setNotes("");
      setImage(null);
      onCreated?.();
    } catch (error) {
      console.error("Error creating pomodoro:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-doro-form">
      <input
        type="text"
        placeholder="What are you working on?"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        required
      />
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
      />
      <button type="submit" disabled={loading || !task}>
        {loading ? "Creating..." : "Create Pomodoro"}
      </button>
    </form>
  );
}
```

### 5.5 Context Updates

**DoroContext**: Minimal changes, same purpose

**Add AuthContext** (TypeScript):

```typescript
// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 6. Leaderboards: Global & Friends

### 6.1 Global Leaderboard Query

**Purpose**: User discovery, public competition, motivation
**Visibility**: All users (public)

```javascript
// Get global weekly leaderboard
const { data: globalLeaderboard } = await supabase.rpc(
  "get_global_leaderboard"
);
```

**Postgres Function:**

```sql
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  completion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    COUNT(p.id) as completion_count
  FROM users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= DATE_TRUNC('week', NOW())
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Friends Leaderboard Query

**Purpose**: Accountability with followed users
**Visibility**: Personalized per user

```javascript
// Get weekly leaderboard for followed users
const { data: friendsLeaderboard } = await supabase.rpc(
  "get_friends_leaderboard",
  {
    user_id: currentUserId,
  }
);
```

**Postgres Function:**

```sql
CREATE OR REPLACE FUNCTION get_friends_leaderboard(user_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  completion_count BIGINT,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    COUNT(p.id) as completion_count,
    true as is_following
  FROM users u
  INNER JOIN pomodoros p ON p.user_id = u.id
  WHERE p.completed = true
    AND p.created_at >= DATE_TRUNC('week', NOW())
    AND (
      u.id = user_id OR  -- Include self
      u.id IN (SELECT following_id FROM follows WHERE follower_id = user_id)
    )
  GROUP BY u.id, u.user_name, u.avatar_url
  ORDER BY completion_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 User Search Query

**Purpose**: Find users to follow
**Visibility**: All users searchable by name

```typescript
// Search users by name
export async function searchUsers(searchTerm: string, currentUserId: string) {
  const { data, error } = await supabase.rpc("search_users", {
    search_term: searchTerm,
    current_user_id: currentUserId,
  });
  return { data, error };
}
```

**Postgres Function:**

```sql
CREATE OR REPLACE FUNCTION search_users(
  search_term TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  is_following BOOLEAN,
  follower_count BIGINT,
  completion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = u.id
    ) as is_following,
    (
      SELECT COUNT(*) FROM follows WHERE following_id = u.id
    ) as follower_count,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE user_id = u.id
      AND completed = true
      AND created_at >= DATE_TRUNC('week', NOW())
    ) as completion_count
  FROM users u
  WHERE u.id != current_user_id
    AND u.user_name ILIKE '%' || search_term || '%'
  ORDER BY follower_count DESC, u.user_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4 Public User Profile Query

**Purpose**: View user stats without seeing their pomodoros
**Visibility**: Public (anyone can view)

```typescript
// Get public user profile
export async function getPublicUserProfile(
  userId: string,
  currentUserId: string | null
) {
  const { data, error } = await supabase.rpc("get_public_user_profile", {
    profile_user_id: userId,
    current_user_id: currentUserId,
  });
  return { data, error };
}
```

**Postgres Function:**

```sql
CREATE OR REPLACE FUNCTION get_public_user_profile(
  profile_user_id UUID,
  current_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  is_following BOOLEAN,
  follower_count BIGINT,
  following_count BIGINT,
  total_completions BIGINT,
  week_completions BIGINT,
  can_view_pomodoros BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_name,
    u.avatar_url,
    u.created_at,
    EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = current_user_id
      AND following_id = profile_user_id
    ) as is_following,
    (SELECT COUNT(*) FROM follows WHERE following_id = profile_user_id) as follower_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = profile_user_id) as following_count,
    (SELECT COUNT(*) FROM pomodoros WHERE user_id = profile_user_id AND completed = true) as total_completions,
    (
      SELECT COUNT(*) FROM pomodoros
      WHERE user_id = profile_user_id
      AND completed = true
      AND created_at >= DATE_TRUNC('week', NOW())
    ) as week_completions,
    (
      profile_user_id = current_user_id OR
      EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = current_user_id
        AND following_id = profile_user_id
      )
    ) as can_view_pomodoros
  FROM users u
  WHERE u.id = profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.5 Real-time Updates

**Optional**: Use Supabase Realtime to update leaderboard live

```javascript
useEffect(() => {
  // Subscribe to pomodoro inserts/updates
  const subscription = supabase
    .channel("leaderboard-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pomodoros",
        filter: `completed=eq.true`,
      },
      (payload) => {
        // Refresh leaderboard
        fetchLeaderboard();
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

## 7. Testing & Validation

### 7.1 Data Integrity Checks

**Post-migration validation queries:**

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check pomodoro count and completion rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed
FROM pomodoros;

-- Check likes count
SELECT COUNT(*) FROM likes;

-- Check comments count
SELECT COUNT(*) FROM comments;

-- Verify RLS is working (should return only accessible rows)
SELECT COUNT(*) FROM pomodoros WHERE completed = true;

-- Check for orphaned data
SELECT COUNT(*) FROM pomodoros WHERE user_id NOT IN (SELECT id FROM users);
SELECT COUNT(*) FROM likes WHERE user_id NOT IN (SELECT id FROM users);
SELECT COUNT(*) FROM comments WHERE user_id NOT IN (SELECT id FROM users);
```

### 7.2 Manual Testing Checklist

- [ ] Google OAuth login works
- [ ] User profile created automatically on signup
- [ ] Can create new pomodoro with timer
- [ ] Image upload to Supabase Storage works
- [ ] Feed shows only followed users' pomodoros (+ own)
- [ ] Can like/unlike pomodoros
- [ ] Can comment on pomodoros
- [ ] Can delete own comments
- [ ] Can delete own pomodoros
- [ ] Follow/unfollow functionality works
- [ ] Leaderboard shows only followed users
- [ ] Search finds pomodoros (respects RLS)
- [ ] User profile shows correct stats
- [ ] Cannot see pomodoros from non-followed users
- [ ] Logout clears session properly

### 7.3 Performance Testing

**Key metrics to monitor:**

- Feed load time (should be <500ms)
- Image upload time
- Search query response time
- Leaderboard generation time

**Database optimization:**

- Monitor slow queries in Supabase dashboard
- Ensure all indexes are being used
- Consider caching leaderboard (refresh every 5 min)

---

## 8. Deployment Strategy

### 8.1 Phased Rollout

**Phase 1: Setup** ✅ COMPLETE

- ✅ Create Supabase project
- ✅ Set up database schema (5 migrations)
- ✅ Configure Google OAuth (credentials configured, login working)
- ⏳ Create storage bucket (pending)

**Phase 2: Migration** ✅ COMPLETE

- ✅ Export Sanity data (users, pomodoros, likes, comments)
- ✅ Download images (from Sanity CDN)
- ✅ Import to Supabase (56 users, 5,226 pomodoros, 1,684 likes, 313 comments)
- ✅ Validate data integrity (verified)

**Phase 3: Frontend Development** 🔄 95% COMPLETE

- ✅ Replace Sanity client with Supabase (supabaseClient.ts created)
- ✅ Update all queries (queries.ts with TypeScript)
- ✅ Update image handling (storage.ts created)
- ✅ Rewrite authentication (AuthContext.tsx, Login.tsx)
- ✅ Migrate all components to Supabase native format (10/10 complete)
- ✅ Remove transformation layer from Feed.tsx
- ✅ Update type system to match Supabase schema
- ⏳ Implement following system UI (code ready, UI components pending)
- ⏳ Create storage bucket for images (manual step required)

**Phase 4: Testing** 🔄 IN PROGRESS

- ✅ Google OAuth login verified (user logged in successfully)
- ✅ App renders at http://localhost:5173/
- ✅ Feed displays with Supabase data (no transformation layer)
- ✅ TypeScript compilation successful (no errors)
- ⏳ Manual feature testing (feed functional, following system pending)
- ⏳ RLS policy validation (pending)
- ⏳ Image upload testing (requires storage bucket creation)
- ⏳ Performance testing (pending)
- ⏳ User acceptance testing (pending)

**Phase 5: Launch** ⏳ PENDING

- Deploy to production
- Monitor error logs
- Notify users of migration
- Provide support for any issues

### 8.2 Rollback Plan

**If critical issues arise:**

1. Keep old Sanity backend running in parallel during transition
2. DNS/routing can switch back to Sanity version
3. Have database backup before migration
4. Can restore Supabase to pre-migration state

### 8.3 Environment Variables

**Update `.env` file for Vite:**

```bash
# Remove Sanity vars
# SANITY_PROJECT_ID=...
# SANITY_TOKEN=...

# Add Supabase vars (note: Vite uses VITE_ prefix)
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Keep Google OAuth (optional, if using custom OAuth flow)
VITE_GOOGLE_CLIENT_ID=...
```

**Important Vite Notes:**

1. Environment variables must be prefixed with `VITE_` to be exposed to client
2. Access via `import.meta.env.VITE_*` instead of `process.env.*`
3. Create `.env.local` for local development (git-ignored)
4. Use `.env.production` for production builds

---

## 9. Cost Comparison

### Sanity (Current)

- Free tier: 10k documents, 5GB bandwidth, 3 users
- Growth: $99/mo - 250k documents, 100GB bandwidth
- Image hosting: Included in plan

### Supabase (New)

- Free tier: 500MB database, 1GB storage, 2GB bandwidth
- Pro: $25/mo - 8GB database, 100GB storage, 250GB bandwidth
- Database: PostgreSQL (more predictable costs)
- Storage: $0.021/GB/month

**Estimated monthly cost**: $25-50 (Pro plan + storage overage)

**Advantages**:

- Lower cost than Sanity Growth
- Better auth features included
- No per-document pricing
- More predictable scaling

---

## 10. Future Enhancements

### 10.1 Phase 1 Enhancements

- [ ] Email notifications for new followers
- [ ] Friend suggestions (mutual follows)
- [ ] Follow requests (optional approval)
- [ ] Privacy settings per pomodoro
- [ ] Export personal data feature

### 10.2 Phase 2 Enhancements

- [ ] Groups/teams for shared leaderboards
- [ ] Direct messages between friends
- [ ] Pomodoro streaks tracking
- [ ] Mobile app (React Native + Supabase)
- [ ] Push notifications for timer completion

### 10.3 Phase 3 Enhancements

- [ ] AI insights on productivity patterns
- [ ] Integration with calendar apps
- [ ] Gamification (badges, achievements)
- [ ] Public profile pages (opt-in)
- [ ] Premium features (advanced analytics)

---

## Questions & Decisions

### 3. Following System Design

**Question**: Should following require approval, or be instant like Twitter?

**Recommendation**:

- **Default**: Instant following (no approval) - simpler, encourages connections
- **Optional**: Add privacy setting to require approval later
- Users can always block/remove followers

**Privacy Levels**:

- **Option A**: Following + privacy settings (public/friends/private)
- **Option B**: Mutual friendship model (approval required)
- **Option C**: Hybrid (default public, opt-in to approval)

**Recommended**: Option A - Following with privacy settings (most flexible)

### 4. Google Auth

**Question**: Any problems keeping Google OAuth?

**Answer**: No issues! ✅

- Supabase natively supports Google OAuth
- Can use same Google OAuth credentials
- Better security than current localStorage approach
- Seamless user experience
- Automatic profile creation via database trigger

**Benefits of Supabase Auth over current**:

1. Secure token management (no localStorage exposure)
2. Automatic session refresh
3. Built-in RLS integration
4. Email verification/password reset built-in
5. Can add other providers (GitHub, Facebook) easily later

---

## Summary

**Key Milestones**:

1. ✅ Vite + TypeScript project setup
2. ✅ Database schema + RLS policies (7 migrations including SQL fixes)
3. ✅ Data migration (56 users, 5,226 pomodoros, 1,684 likes, 313 comments)
4. ✅ TypeScript migration scripts (export/import complete)
5. ✅ Google Auth integration (configured and working)
6. ✅ Frontend query rewrites (TypeScript) - all library files created
7. ✅ Component migration to Supabase native format (10/10 complete)
8. ✅ Transformation layer removed (direct Supabase data usage)
9. ✅ Type system updated to match Supabase schema
10. ✅ Authentication working (user successfully logged in)
11. ✅ App rendering successfully at http://localhost:5173/
12. ✅ Storage bucket created (pomodoro-images)
13. ✅ Following system UI (5 components built and integrated)
14. ✅ Routes integrated (/discover, /leaderboard)
15. ✅ SQL ambiguity fixed (search_users function)
16. ⏳ Multi-user RLS testing (requires 3+ test accounts)
17. ⏳ Image upload testing (storage bucket ready)
18. ⏳ Documentation & deployment (pending)

**Risk Factors**:

- Data migration complexity (mitigated by thorough testing)
- RLS policy bugs (test extensively with different user scenarios)
- Image migration size/time (download/upload overnight)
- User confusion post-migration (clear communication plan)

**Success Metrics**:

- ✅ All migrated data accessible in Supabase (56 users, 5,226 pomodoros)
- ✅ Zero data loss from Sanity (validated)
- ✅ Authentication seamless with Google (working)
- ✅ Type-safe codebase with TypeScript (all components migrated)
- ✅ Faster development builds with Vite (dev server running)
- ✅ Following system UI integrated (/discover, /leaderboard)
- ✅ Storage bucket created and configured
- ⏳ Feed shows followed users' content (RLS testing pending)
- ⏳ Image uploads working (storage ready, testing pending)
- ⏳ App performance equal or better than before (testing in progress)
- ⏳ User engagement maintained/increased with following feature (pending)

---

## Vite + TypeScript Migration Benefits

### Why Vite over Create React App?

**Performance:**

- ⚡️ Instant HMR (Hot Module Replacement) - updates in milliseconds
- 🚀 Native ES modules - no bundling in dev mode
- 📦 Optimized production builds with Rollup
- 🔥 10-100x faster dev server startup

**Developer Experience:**

- ✨ Out-of-the-box TypeScript support
- 🎯 Better tree-shaking
- 🛠 Smaller bundle sizes
- 🔧 Simpler configuration

### Why TypeScript?

**Type Safety:**

- 🛡 Catch errors at compile-time
- 📝 Better IDE autocomplete
- 🔍 Easier refactoring
- 📚 Self-documenting code

**Supabase Integration:**

- 🎯 Generated types from database schema
- ✅ Type-safe queries
- 🔒 Compile-time validation of data structures
- 💡 IntelliSense for database tables/columns

### Key Changes Summary

**Build Tool Changes:**

- `package.json` scripts: `react-scripts` → `vite`
- Config: `webpack` → `vite.config.ts`
- Entry point: `public/index.html` → `index.html` (root)

**Environment Variables:**

- Prefix: `REACT_APP_*` → `VITE_*`
- Access: `process.env.*` → `import.meta.env.*`

**Import Changes:**

- No need for `.jsx`/`.tsx` extensions in imports
- Path aliases supported out-of-the-box with `@/*`
- JSON imports work natively

**File Structure:**

```
src/
├── lib/              # Utilities and clients
│   ├── supabaseClient.ts
│   ├── queries.ts
│   └── storage.ts
├── types/            # TypeScript types
│   └── supabase.ts  # Generated from schema
├── contexts/         # React contexts
│   └── AuthContext.tsx
├── components/       # React components
│   ├── FollowButton.tsx
│   └── CreateDoro.tsx
├── pages/           # Route pages
│   ├── Home.tsx
│   ├── Login.tsx
│   └── Feed.tsx
└── App.tsx
```

**Type Generation Workflow:**

```bash
# 1. Make schema changes in Supabase
# 2. Generate types
npx supabase gen types typescript --project-id "your-id" > src/types/supabase.ts
# 3. TypeScript now knows your database structure!
```
