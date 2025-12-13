# Phase 1 Setup - Complete ✓

**Date:** December 13, 2024
**Status:** Successfully Completed

---

## Overview

Phase 1 of the Supabase migration has been successfully completed. All database schemas, security policies, functions, and storage configurations are now in place.

## Completed Tasks

### 1. Database Schema ✓

- **Migration:** `initial_schema`
- Created 5 core tables:
  - `users` - User profiles linked to Supabase Auth
  - `pomodoros` - Main content (tasks, notes, completion status)
  - `likes` - Pomodoro likes with user tracking
  - `comments` - User comments on pomodoros
  - `follows` - Friend/following relationships
- Added 9 performance indexes including full-text search on tasks/notes
- All tables have proper foreign key constraints and check constraints

### 2. Row-Level Security (RLS) Policies ✓

- **Migration:** `rls_policies`
- Enabled RLS on all 5 tables
- Implemented privacy-first model:
  - Users can only see pomodoros from people they follow
  - Users can view/manage their own content
  - Public profiles are viewable by everyone
  - Follow relationships are public for discovery
- Total: 16 RLS policies configured

### 3. Database Functions & Triggers ✓

- **Migration:** `functions_and_triggers` + `fix_function_security`
- Auto-update `updated_at` timestamps on modifications
- Automatic user profile creation on signup (via auth.users trigger)
- All functions secured with proper `search_path` settings

### 4. Leaderboard & Discovery Functions ✓

- **Migration:** `leaderboard_functions_fixed`
- `get_global_leaderboard()` - All users ranked by weekly completions
- `get_friends_leaderboard(user_id)` - Personalized leaderboard for followed users
- `search_users(term, current_user_id)` - Find users by name
- `get_public_user_profile(profile_id, current_user_id)` - Public user stats

### 5. Storage Policies ✓

- **Migration:** `storage_policies`
- Configured for `pomodoro-images` bucket
- Users can upload to their own folder (`{user_id}/filename`)
- Users can view images from people they follow
- Users can delete only their own images

### 6. Security Validation ✓

- Fixed all "Function Search Path Mutable" warnings
- All functions now use: `SET search_path = public, pg_temp`
- Zero security advisories remaining

---

## Database Statistics

| Table     | Columns | RLS Enabled | Rows |
| --------- | ------- | ----------- | ---- |
| users     | 8       | ✓           | 0    |
| pomodoros | 9       | ✓           | 0    |
| likes     | 4       | ✓           | 0    |
| comments  | 6       | ✓           | 0    |
| follows   | 4       | ✓           | 0    |

## Applied Migrations

1. `20251213202829_initial_schema`
2. `20251213202859_rls_policies`
3. `20251213202918_functions_and_triggers`
4. `20251213203014_leaderboard_functions_fixed`
5. `20251213203228_storage_policies`
6. `20251213203538_fix_function_security`

---

## Manual Steps Required

### Storage Bucket Creation

The storage bucket `pomodoro-images` needs to be created manually in the Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Configure:
   - **Name:** `pomodoro-images`
   - **Public:** `false` (private, controlled by RLS)
   - **File Size Limit:** 5MB
   - **Allowed MIME Types:**
     - image/png
     - image/jpeg
     - image/jpg
     - image/gif
     - image/webp
     - image/heic

Alternatively, run the setup script (requires environment variables):

```bash
# Create .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run setup:storage
```

### Google OAuth Configuration

Configure Google OAuth in Supabase Dashboard:

1. Go to **Authentication** > **Providers** > **Google**
2. Enable the provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Set authorized redirect URI:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
5. Update Google Console with the callback URL

---

## Next Steps: Phase 2 - Data Migration

With Phase 1 complete, you can now proceed to Phase 2:

1. **Export data from Sanity CMS**

   ```bash
   npm run migrate:export
   ```

2. **Download Sanity images**

   ```bash
   npm run migrate:download
   ```

3. **Import to Supabase**
   ```bash
   npm run migrate:import
   ```

Note: Migration scripts are scaffolded in `scripts/` directory and will need:

- Sanity credentials (`SANITY_PROJECT_ID`, `SANITY_TOKEN`)
- Supabase credentials in `.env` file

---

## Testing Recommendations

Before proceeding to data migration, test the following:

### Database Access

```sql
-- Test user creation (will happen via trigger)
-- Should auto-create profile in public.users

-- Test pomodoro creation
INSERT INTO pomodoros (user_id, task, launch_at)
VALUES (auth.uid(), 'Test task', NOW());

-- Test RLS (should only see own pomodoros)
SELECT * FROM pomodoros;
```

### Function Testing

```sql
-- Test global leaderboard (empty for now)
SELECT * FROM get_global_leaderboard();

-- Test user search (no users yet)
SELECT * FROM search_users('test', auth.uid());
```

### API Testing

Use the Supabase JavaScript client to test:

- Authentication flow
- Profile creation
- CRUD operations
- Feed queries (with RLS)

---

## Resources

- **Supabase Dashboard:** https://app.supabase.com
- **Database Schema:** See `supabase/migrations/` directory
- **Migration Plan:** See `.github/plan-supabaseMigration.prompt.md`
- **Security Linter:** [Function Search Path Guide](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

---

## Support & Troubleshooting

If you encounter issues:

1. **Check migrations:** `mcp_supabase_list_migrations`
2. **View security advisors:** `mcp_supabase_get_advisors`
3. **Inspect tables:** `mcp_supabase_list_tables`
4. **Review logs:** Supabase Dashboard > Database > Logs

Common issues:

- RLS blocking queries → Check if user is authenticated
- Storage upload fails → Verify bucket exists and policies are applied
- Function errors → Check `search_path` is set properly

---

**Phase 1 Status:** ✅ COMPLETE
**Ready for Phase 2:** ✅ YES
