# 🔍 Supabase Advisor Report

**Generated:** December 17, 2025
**Project:** Doros Supabase Migration

---

## 🛡️ Security Advisors

### ⚠️ Leaked Password Protection Disabled

**Level:** WARNING
**Category:** SECURITY
**Status:** Action Required

**Description:**
Leaked password protection is currently disabled. Supabase Auth can check passwords against HaveIBeenPwned.org to prevent use of compromised passwords.

**Impact:**
Users may set passwords that have been exposed in data breaches.

**Remediation:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Leaked Password Protection"
3. Link: https://supabase.com/docs/guides/auth/password-security

**Priority:** HIGH - Enable before production deployment

---

## ⚡ Performance Advisors

### 📊 Summary

- **Total Issues:** 22
- **Warnings:** 17
- **Info:** 5

---

### ⚠️ Auth RLS Initialization Plan (15 issues)

**Level:** WARNING
**Category:** PERFORMANCE
**Impact:** Suboptimal query performance at scale

**Description:**
RLS policies are re-evaluating `auth.uid()` for each row instead of once per query.

**Affected Policies:**

**users table:**

- ✓ Users can update own profile

**pomodoros table:**

- ✓ Users can view own pomodoros
- ✓ Users can view followed users' pomodoros
- ✓ Users can insert own pomodoros
- ✓ Users can update own pomodoros
- ✓ Users can delete own pomodoros

**likes table:**

- ✓ Users can insert own likes
- ✓ Users can delete own likes

**comments table:**

- ✓ Users can insert own comments
- ✓ Users can update own comments
- ✓ Users can delete own comments

**follows table:**

- ✓ Users can insert own follows
- ✓ Users can delete own follows

**Fix:**
Replace `auth.uid()` with `(select auth.uid())` in all policies.

**Example:**

```sql
-- Before
CREATE POLICY "Users can view own pomodoros"
ON pomodoros FOR SELECT
USING (user_id = auth.uid());

-- After (optimized)
CREATE POLICY "Users can view own pomodoros"
ON pomodoros FOR SELECT
USING (user_id = (select auth.uid()));
```

**Priority:** MEDIUM - Optimize after testing complete
**Reference:** https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

---

### ⚠️ Multiple Permissive Policies (4 issues)

**Level:** WARNING
**Category:** PERFORMANCE
**Impact:** Each policy executes for every query, reducing performance

**Affected Table:** pomodoros
**Action:** SELECT
**Roles:** anon, authenticated, authenticator, dashboard_user

**Current Policies:**

1. "Users can view followed users' pomodoros"
2. "Users can view own pomodoros"

**Problem:**
Both policies run for every SELECT query on pomodoros table.

**Fix:**
Combine into single policy with OR condition:

```sql
-- Current (2 policies)
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

-- Optimized (1 policy)
CREATE POLICY "Users can view accessible pomodoros"
ON pomodoros FOR SELECT
USING (
  user_id = (select auth.uid())
  OR user_id IN (
    SELECT following_id FROM follows WHERE follower_id = (select auth.uid())
  )
);
```

**Priority:** MEDIUM - May impact feed performance
**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

---

### ℹ️ Unindexed Foreign Keys (2 issues)

**Level:** INFO
**Category:** PERFORMANCE
**Impact:** Slower joins on user lookups

**Affected Tables:**

**comments table:**

- Foreign key: `comments_user_id_fkey`
- Missing index on: `user_id` column

**likes table:**

- Foreign key: `likes_user_id_fkey`
- Missing index on: `user_id` column

**Fix:**
Add indexes in new migration:

```sql
-- Add indexes for foreign keys
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
```

**Priority:** LOW - Small tables, minimal impact
**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

---

### ℹ️ Unused Indexes (3 issues)

**Level:** INFO
**Category:** PERFORMANCE
**Impact:** Indexes consuming storage without benefit

**Affected Table:** pomodoros

**Unused Indexes:**

1. `idx_pomodoros_completed` - Never used
2. `idx_pomodoros_task_search` - Never used
3. `idx_pomodoros_notes_search` - Never used

**Analysis:**
These indexes were created but queries don't use them. Either:

1. Queries need to be updated to use the indexes
2. Indexes should be removed to save storage

**Fix Option 1 - Remove unused:**

```sql
DROP INDEX idx_pomodoros_completed;
DROP INDEX idx_pomodoros_task_search;
DROP INDEX idx_pomodoros_notes_search;
```

**Fix Option 2 - Update queries to use indexes:**

```sql
-- Example: Use text search index
SELECT * FROM pomodoros
WHERE to_tsvector('english', task) @@ to_tsquery('english', 'search_term');
```

**Priority:** LOW - Cleanup item
**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

---

## 🎯 Recommended Action Plan

### Before Production Deployment

**High Priority (Required):**

1. ✅ Enable leaked password protection in Auth settings

**Medium Priority (Recommended):** 2. ⚙️ Combine duplicate SELECT policies on pomodoros table 3. ⚙️ Optimize RLS policies to use `(select auth.uid())`

**Low Priority (Optional):** 4. 🔧 Add indexes for foreign keys on comments and likes 5. 🧹 Remove or utilize unused indexes on pomodoros

---

## 📊 Migration Script Template

Create `supabase/migrations/20241217000002_optimize_performance.sql`:

```sql
-- Migration: Optimize Performance (Advisor Fixes)
-- Created: December 17, 2025

-- 1. Combine duplicate SELECT policies on pomodoros
DROP POLICY IF EXISTS "Users can view own pomodoros" ON pomodoros;
DROP POLICY IF EXISTS "Users can view followed users' pomodoros" ON pomodoros;

CREATE POLICY "Users can view accessible pomodoros"
ON pomodoros FOR SELECT
USING (
  user_id = (select auth.uid())
  OR user_id IN (
    SELECT following_id FROM follows WHERE follower_id = (select auth.uid())
  )
);

-- 2. Optimize other RLS policies (example - repeat for all)
-- Users table
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = (select auth.uid()));

-- 3. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- 4. Remove unused indexes (optional)
-- DROP INDEX IF EXISTS idx_pomodoros_completed;
-- DROP INDEX IF EXISTS idx_pomodoros_task_search;
-- DROP INDEX IF EXISTS idx_pomodoros_notes_search;

-- Note: Complete all policy optimizations following same pattern
```

---

## 📝 Notes

**Current Status:**

- App is functional and ready for testing
- Performance warnings are non-critical
- Security warning requires manual dashboard configuration
- All optimizations can be done after successful testing

**Testing Priority:**
Focus on functionality testing first (Phase 4). Address performance optimizations only if slowness observed during testing.

**When to Optimize:**

- After Phase 4 testing complete
- Before Phase 5 production deployment
- If performance issues detected during testing

---

## 🔗 Quick Links

**Supabase Dashboard:**

- Auth Settings: https://supabase.com/dashboard/project/gwiwnpawhribxvjfxkiw/auth/settings
- Database Health: https://supabase.com/dashboard/project/gwiwnpawhribxvjfxkiw/database/advisors

**Documentation:**

- [RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Auth Security](https://supabase.com/docs/guides/auth/password-security)
