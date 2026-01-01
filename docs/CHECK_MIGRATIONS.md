# How to Check if Migrations Have Been Run

This guide shows you multiple ways to verify which Supabase migrations have been applied to your database.

## Method 1: Using Supabase CLI (Recommended)

### Check Migration Status

```bash
# List all migrations and their status
supabase migration list

# Or if you're linked to a remote project:
supabase migration list --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Check for Unapplied Migrations

```bash
# This will show you which migrations are pending
supabase db remote commit

# Or check the diff between local and remote:
supabase db diff
```

## Method 2: Query the Database Directly

Supabase tracks migrations in the `supabase_migrations.schema_migrations` table. You can query it directly:

### Using Supabase Dashboard SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
-- List all applied migrations
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC;
```

### Using psql or Supabase CLI

```bash
# Connect to your database
supabase db connect

# Then run:
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC;
```

### Count Applied vs. Local Migrations

```sql
-- Count applied migrations
SELECT COUNT(*) as applied_migrations
FROM supabase_migrations.schema_migrations;

-- Compare with your local migration files (23 files in your case)
-- You should see 23 rows if all migrations are applied
```

## Method 3: Check Specific Migration

To check if a specific migration has been applied:

```sql
-- Check if a specific migration exists
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version = '20250101000001';  -- Replace with your migration version

-- Or check by name pattern
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%soft_delete%';
```

## Method 4: Verify by Database Objects

You can also verify migrations by checking if the objects they create exist:

### Check Soft-Delete Migrations (Your Recent Ones)

```sql
-- Check if deleted_at column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'deleted_at';

-- Check if soft_delete_account function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('soft_delete_account', 'restore_account');

-- Check if active_users view exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'active_users';
```

## Method 5: Using Supabase Dashboard

1. Go to **Database** → **Migrations** in your Supabase Dashboard
2. You'll see a list of all applied migrations with timestamps

## Quick Check Script

Here's a quick way to compare local migrations with applied ones:

```bash
# Count local migration files
echo "Local migrations:"
ls -1 supabase/migrations/*.sql | wc -l

# Count applied migrations (requires database connection)
# Run this in SQL Editor:
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
```

## Expected Results for Your Project

Based on your migration files, you should have **23 migrations** applied:

1. `20241213000001_initial_schema.sql`
2. `20241213000002_rls_policies.sql`
3. `20241213000003_functions_and_triggers.sql`
4. `20241213000004_leaderboard_functions.sql`
5. `20241213000005_storage_policies.sql`
6. `20241217000001_fix_search_users_ambiguity.sql`
7. `20241221000001_suggested_users.sql`
8. `20241221000002_follow_requests.sql`
9. `20241222000001_blocks_table.sql`
10. `20241222000002_update_functions_for_blocks.sql`
11. `20241222000003_approve_follow_function.sql`
12. `20241223000001_fix_suggested_users_fallback.sql`
13. `20241223000002_fix_search_users_ambiguous_column.sql`
14. `20241224000001_fix_users_table_security.sql`
15. `20241225000001_bidirectional_blocking_rls.sql`
16. `20241225000002_bidirectional_blocking_functions.sql`
17. `20250101000001_add_soft_delete.sql` ⭐ (new)
18. `20250101000002_soft_delete_rpcs.sql` ⭐ (new)
19. `20250101000003_update_functions_exclude_deleted.sql` ⭐ (new)
20. `20250101000004_update_rls_exclude_deleted.sql` ⭐ (new)
21. `20250101000005_optimize_functions.sql` ⭐ (new)
22. `20251223215157_rename_to_followers_only_and_enable_global_feed.sql`
23. `20251224000001_update_storage_policies_to_match_pomodoros.sql`

## Troubleshooting

### If Migrations Are Missing

If you see fewer than 23 migrations applied:

1. **Check if you're connected to the right database**
   ```bash
   supabase status
   ```

2. **Apply pending migrations**
   ```bash
   supabase db push
   ```

3. **Or apply manually via SQL Editor**
   - Copy the SQL from the migration file
   - Paste it into the SQL Editor
   - Run it

### If You See Errors

- Check the Supabase Dashboard **Logs** for migration errors
- Verify your database connection string
- Ensure you have the correct permissions

## Quick Reference

```bash
# Most common commands:
supabase migration list          # List migrations
supabase db push                 # Apply pending migrations
supabase db diff                 # See what's different
supabase db connect              # Connect to database
```



