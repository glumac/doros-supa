# Phase 2: Data Migration - Setup Guide

**Status:** Ready to Execute
**Prerequisites:** Phase 1 Complete ✅

---

## Overview

Phase 2 migrates all data from Sanity CMS to Supabase, including users, pomodoros, likes, comments, and images.

## ⚠️ Important: Complete Before Migration

### 1. Create Storage Bucket

**The storage bucket MUST be created before running the import script.**

Go to [Supabase Dashboard](https://gwiwnpawhribxvjfxkiw.supabase.co) → Storage → New Bucket:

- **Name:** `pomodoro-images`
- **Public:** `false` (private)
- **File size limit:** 5MB
- **Allowed MIME types:**
  - image/png
  - image/jpeg
  - image/jpg
  - image/gif
  - image/webp
  - image/heic

### 2. Configure Environment Variables

Create a `.env` file in the project root with the following:

```bash
# Supabase Configuration (from Phase 1)
SUPABASE_URL=https://gwiwnpawhribxvjfxkiw.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sanity Configuration (get from Sanity dashboard)
SANITY_PROJECT_ID=your-sanity-project-id
SANITY_TOKEN=your-sanity-read-token
```

**To get Sanity credentials:**
1. Go to [sanity.io/manage](https://sanity.io/manage)
2. Select your project
3. **Project ID:** Found in project settings
4. **Token:** Settings → API → Tokens → Add API Token (read access)

---

## Migration Scripts

Three scripts are ready to execute:

### 1. Export from Sanity
```bash
npm run migrate:export
```

**What it does:**
- Connects to Sanity CMS
- Exports all users, pomodoros, likes, comments
- Saves to `migration-data/*.json` files

**Output:**
- `migration-data/users.json`
- `migration-data/pomodoros.json`
- `migration-data/likes.json`
- `migration-data/comments.json`

### 2. Download Images
```bash
npm run migrate:download
```

**What it does:**
- Reads pomodoros.json
- Downloads all images from Sanity CDN
- Saves to `migration-data/images/`

**Output:**
- `migration-data/images/{pomodoro-id}.jpg`

### 3. Import to Supabase
```bash
npm run migrate:import
```

**What it does:**
- Creates auth users in Supabase
- Maps Sanity IDs to Supabase UUIDs
- Uploads images to Storage
- Imports pomodoros with preserved timestamps
- Imports likes and comments
- Maintains all relationships

**Output:**
- Users in `auth.users` + `public.users`
- Pomodoros in `public.pomodoros`
- Images in Storage bucket
- Likes in `public.likes`
- Comments in `public.comments`

---

## Execution Order

**⚠️ Run scripts in this exact order:**

```bash
# 1. Export data from Sanity
npm run migrate:export

# 2. Download images (if any)
npm run migrate:download

# 3. Import to Supabase
npm run migrate:import
```

---

## Data Preservation

The migration preserves:
- ✅ Original timestamps (`created_at`, `updated_at`)
- ✅ User emails and names
- ✅ Pomodoro tasks and notes
- ✅ Completion status
- ✅ All likes and comments
- ✅ Image associations

**Note:** Users will need to:
- Sign in with Google again (Supabase Auth)
- Their profiles will be automatically linked by email

---

## Validation Queries

After import, run these in Supabase SQL Editor:

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check pomodoro count
SELECT COUNT(*) FROM pomodoros;

-- Check likes
SELECT COUNT(*) FROM likes;

-- Check comments
SELECT COUNT(*) FROM comments;

-- Verify data integrity
SELECT
  u.user_name,
  COUNT(p.id) as pomodoro_count,
  SUM(CASE WHEN p.completed THEN 1 ELSE 0 END) as completed_count
FROM users u
LEFT JOIN pomodoros p ON p.user_id = u.id
GROUP BY u.id, u.user_name
ORDER BY pomodoro_count DESC;
```

---

## Rollback Plan

If issues occur:
1. Keep Sanity data intact (don't delete)
2. Export files are in `migration-data/` for re-import
3. Can truncate Supabase tables and re-run import
4. Storage bucket can be emptied and re-uploaded

**Truncate commands (if needed):**
```sql
-- WARNING: This deletes all data!
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE likes CASCADE;
TRUNCATE TABLE pomodoros CASCADE;
-- Users are in auth.users, must be deleted via auth.admin API
```

---

## Troubleshooting

### "Missing Sanity credentials"
- Check `.env` file exists
- Verify `SANITY_PROJECT_ID` and `SANITY_TOKEN` are set
- Token must have read access

### "Missing Supabase credentials"
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Service role key is different from anon key (check Dashboard → Settings → API)

### "Storage bucket not found"
- Create the bucket manually in Supabase Dashboard first
- Bucket name must be exactly `pomodoro-images`

### "User already exists"
- Some users may already exist from testing
- Script will skip and continue with next user

### Image upload failures
- Check bucket exists and policies are applied
- Verify images downloaded correctly in step 2
- Individual image failures won't stop the import

---

## Next Steps After Migration

Once data is imported:

1. ✅ Validate data with SQL queries
2. ✅ Check storage bucket has images
3. ✅ Test user login with Google OAuth
4. ✅ Verify RLS policies work correctly
5. ▶️  Move to Phase 3: Frontend Development

---

**Ready to migrate?** Start with: `npm run migrate:export`
