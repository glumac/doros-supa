# Time and Date Management Strategy

## Overview

This document outlines how dates and times are handled across the Doros application, including timezone strategies, database storage, frontend handling, and identified issues.

## Database Strategy (Supabase/PostgreSQL)

### Timestamp Storage

All timestamps in the `pomodoros` table are stored as **`timestamptz` (timestamp with time zone)**:

- `launch_at` - When the pomodoro session was started (user's local time converted to UTC)
- `created_at` - When the record was created in the database (UTC)
- `updated_at` - When the record was last updated (UTC)

**Storage Format**: Timestamps are stored in UTC internally by PostgreSQL. When data is inserted or queried, PostgreSQL automatically converts between UTC and any specified timezone.

### Timezone Strategy: EST/America/New_York

The application uses **Eastern Time (America/New_York)** as the canonical timezone for:

1. **Weekly Leaderboard** - Weeks run Monday-Sunday in EST
2. **User Stats** - All aggregations (daily, weekly, monthly) are calculated in EST
3. **Date Grouping** - All `DATE()` conversions use EST timezone

**Database Functions Using EST:**

```sql
-- Weekly Leaderboard
get_global_leaderboard:
  - Uses DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York')
  - Filters pomodoros created this week in EST

-- User Stats Functions
get_user_daily_completions:
  - Groups by DATE(launch_at AT TIME ZONE 'America/New_York')

get_user_weekly_completions:
  - Groups by DATE_TRUNC('week', launch_at AT TIME ZONE 'America/New_York')

get_user_monthly_completions:
  - Groups by DATE_TRUNC('month', launch_at)

get_user_stats:
  - Uses launch_at for completed pomodoros
  - Uses created_at for total pomodoros
```

**Why EST?**

- Provides consistency for all users regardless of their location
- Prevents "week drift" where different users see different weekly leaderboards
- Simplifies date-based queries and aggregations

## Frontend Strategy

### Date Creation and Submission

When creating a pomodoro:

```typescript
// CreateDoro.tsx
const launchTime = new Date().toISOString(); // User's local time → ISO string (UTC)

// Submitted to database
{
  launch_at: launchAt || new Date().toISOString(),
  // Other fields...
}
```

**Result**: `launch_at` captures the user's local moment in time, stored as UTC in the database.

### Date Display

Dates are displayed in the user's local timezone using `date-fns`:

```typescript
// Doro.tsx, DoroDetail.tsx
format(new Date(launch_at), "h:mm a"); // "Today 3:45 PM" in user's timezone
```

**Result**: Users see times in their local timezone, but all database operations use EST for grouping/filtering.

### Date Range Calculations (Stats Page)

The `UserStats` component uses utility functions that calculate date ranges in EST:

```typescript
// src/utils/dateUtils.ts
getCurrentDateEST() - Gets current time in EST
getThisWeekStartEST() - Monday 00:00:00 EST
getThisWeekEndEST() - Sunday 23:59:59 EST
getThisMonthStartEST() - 1st of month 00:00:00 EST
// ... etc
```

**Date Range Formation:**

1. Frontend calculates start/end dates in EST timezone
2. Converts to UTC ISO strings for API calls
3. Backend receives UTC timestamps
4. Backend converts back to EST for grouping: `launch_at AT TIME ZONE 'America/New_York'`

**Example Flow:**

```typescript
// Frontend: "This Week" button clicked
start = getThisWeekStartEST() // Mon Jan 27, 2025 00:00:00 EST → converts to UTC
end = getThisWeekEndEST()     // Sun Feb 2, 2025 23:59:59 EST → converts to UTC

// Sent to API
startDate: "2025-01-27T05:00:00.000Z" (UTC)
endDate: "2025-02-03T04:59:59.999Z" (UTC)

// Database query
WHERE launch_at >= '2025-01-27T05:00:00.000Z'
  AND launch_at <= '2025-02-03T04:59:59.999Z'
GROUP BY DATE(launch_at AT TIME ZONE 'America/New_York')
```

## Identified Issues

### Issue 1: Mixed Use of `created_at` vs `launch_at`

**Problem**: The `findFirstPomodoroInRange` function uses `created_at` for filtering, but stats functions use `launch_at`.

```typescript
// queries.ts - findFirstPomodoroInRange (WRONG)
.gte("created_at", startDate)
.lte("created_at", endDate)
.order("created_at", { ascending: true })

// Database functions (CORRECT)
WHERE launch_at >= v_start_date
  AND launch_at <= v_end_date
```

**Impact**:

- When clicking a chart bar for March 2025, the function searches by `created_at`
- But the chart shows data grouped by `launch_at`
- A pomodoro launched on Feb 28 (EST) but completed/created on March 1 (EST) will:
  - Show in February stats (grouped by `launch_at`)
  - Be found by March search (filtered by `created_at`)
  - Cause navigation to wrong pomodoro (Feb 28 instead of March pomodoro)

**Example:**

```
Pomodoro A:
  launch_at: 2025-02-28 23:30:00 EST (started late night)
  created_at: 2025-03-01 00:05:00 EST (completed after midnight)

March chart shows: 0 pomodoros (because launch_at is in Feb)
User clicks March bar → findFirstPomodoroInRange searches created_at
  → Finds Pomodoro A (created in March)
  → Navigates to Feb 28 pomodoro (wrong!)
```

### Issue 2: Naive Date Parsing in Frontend

**Problem**: Using `new Date(dateStr + 'T00:00:00')` without timezone specifier.

```typescript
// dateUtils.ts - parseDate
export function parseDate(dateStr: string): Date {
  const date = new Date(dateStr + "T00:00:00");
  return date;
}
```

**Impact**:

- Without a timezone (`Z` or offset), JavaScript interprets as **local timezone**
- For users in PST/PDT, "2025-03-01T00:00:00" is interpreted as PST
- When converted to UTC, becomes "2025-03-01T08:00:00Z"
- This can cause off-by-one-day errors when comparing with database timestamps in UTC

**Better approach**:

```typescript
// Parse as UTC explicitly
new Date(dateStr + "T00:00:00Z");
// OR use date-fns parseISO with timezone handling
```

### Issue 3: Month/Year Start Date Calculations

**Problem**: `getThisMonthStartEST()` manually adds 5 hours to represent EST offset:

```typescript
export function getThisMonthStartEST(): Date {
  const now = getCurrentDateEST();
  // 1st of month at midnight EST = 1st at 5am UTC
  const firstDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), 1, 5, 0, 0, 0),
  );
  return firstDay;
}
```

**Issue**: Hardcodes EST offset as 5 hours, but EST/EDT changes with DST:

- EST (winter): UTC-5
- EDT (summer): UTC-4

**Impact**: During EDT periods (March-November), date ranges are off by 1 hour.

### Issue 4: Chart Data Date Parsing

**Problem**: Inconsistent timezone handling when formatting chart dates:

```typescript
// UserStats.tsx - chartData
date: new Date(d.date + "T12:00:00").toLocaleDateString(...)
```

**Why T12:00:00?**: Adding "T12:00:00" (noon) prevents UTC interpretation that could shift the date.

**Example**:

```
Without T12:00:00:
  "2025-03-01" → new Date("2025-03-01")
  → Interpreted as 2025-03-01T00:00:00 in local tz (PST)
  → For PST user, this becomes 2025-02-28T16:00:00 PST
  → Display shows "Feb 28" (WRONG!)

With T12:00:00:
  "2025-03-01T12:00:00" → new Date("2025-03-01T12:00:00")
  → Stays as March 1 noon in local tz
  → Display shows "Mar 1" (CORRECT!)
```

**Better approach**: Use explicit UTC parsing or date-fns utilities.

## Recommendations

### Option A: Keep EST Strategy (Current)

**Pros:**

- Consistent leaderboard for all users
- Single source of truth for "week" boundaries
- Simpler backend queries

**Cons:**

- Users in other timezones see stats that don't align with their local day
- A pomodoro completed at 11 PM PST counts toward "tomorrow" in EST

**Requires:**

1. Fix `findFirstPomodoroInRange` to use `launch_at` instead of `created_at`
2. Fix DST handling in date utility functions
3. Add explicit UTC timezone indicators when parsing dates
4. Consider showing "(times in ET)" in UI

### Option B: User-Local Timezone

**Pros:**

- Each user sees their own local day/week boundaries
- More intuitive: "today" = actual today for the user
- Accurate "this week" stats per user

**Cons:**

- Weekly leaderboard becomes inconsistent across timezones
- More complex database queries (need to know user's timezone)
- Requires storing user timezone preference

**Requires:**

1. Add `timezone` field to `users` table
2. Pass user timezone to all stats functions
3. Update database functions to use user timezone instead of EST
4. Handle timezone changes when user travels

### Option C: Hybrid Approach (Recommended)

**Use EST for:**

- Weekly leaderboard (keeps it fair and consistent)
- Public-facing weekly competitions

**Use User Local Time for:**

- Personal stats ("this week", "this month", "today")
- Chart groupings
- Goal tracking

**Requires:**

1. Two sets of stats functions: `get_user_stats_est` and `get_user_stats_local`
2. Store user timezone in database
3. UI toggle: "Show my local time" vs "Show ET"

## Action Items

### Critical Fixes (Do Now)

1. **Fix `findFirstPomodoroInRange` to use `launch_at`**

   ```typescript
   // Change from:
   .gte("created_at", startDate)
   // To:
   .gte("launch_at", startDate)
   ```

2. **Fix date parsing to use UTC**

   ```typescript
   // Change from:
   new Date(dateStr + "T00:00:00");
   // To:
   new Date(dateStr + "T00:00:00Z"); // Explicit UTC
   ```

3. **Add DST-aware timezone conversion**
   ```typescript
   // Use Intl or date-fns-tz for proper EST/EDT handling
   import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
   ```

### Enhancements (Later)

1. Add user timezone preference to database
2. Implement hybrid timezone strategy
3. Add UI indicator showing which timezone is being used
4. Add tests for timezone edge cases (DST transitions, year boundaries, etc.)

## Testing Considerations

When testing date-related functionality:

1. **Mock current date** to specific timezone-sensitive moments:
   - Just before/after midnight EST
   - During DST transition
   - At month/year boundaries

2. **Test with different user timezones**:
   - PST (UTC-8)
   - EST (UTC-5)
   - GMT (UTC+0)
   - JST (UTC+9)

3. **Verify consistency**:
   - Stats grouped by `launch_at` match chart navigation using `launch_at`
   - Date ranges include full days in EST regardless of user timezone
   - "This week" stats only include pomodoros from Monday-Sunday EST

## Summary

**Current State:**

- Database stores all timestamps in UTC (`timestamptz`)
- Backend uses EST for all grouping/filtering operations
- Frontend displays dates in user's local timezone
- **BUG**: `findFirstPomodoroInRange` uses `created_at` while stats use `launch_at`

**Recommended Fix:**

1. Change `findFirstPomodoroInRange` to filter/order by `launch_at` (critical)
2. Fix date parsing to be explicitly UTC-aware
3. Consider hybrid timezone approach for better UX
4. Add DST-aware date utilities using proper timezone libraries

**For "This Week" Accuracy:**
Using EST for week boundaries ensures consistent results, but requires users to understand that "this week" = "this week in ET". Consider adding UI hints or allowing users to toggle between local/ET timezones.
