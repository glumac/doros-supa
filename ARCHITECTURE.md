# Doros (Crush Quest) - Architecture Summary

**Purpose:** Pomodoro timer social app with feed, leaderboards, privacy controls, and follow/block features.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS (custom config with extended widths/heights, Luckiest Guy font)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** TanStack Query (React Query) + Context API
- **Testing:** Vitest + React Testing Library + jsdom
- **Monitoring:** Sentry
- **Deployment:** Netlify

---

## React Patterns

### State Management

- **TanStack Query** for server state (queries/mutations with automatic caching, invalidation)
  - Default: 5min staleTime, 10min gcTime, refetchOnWindowFocus enabled
  - Some hooks override staleTime (e.g., `useFeed` uses 2min, `useSearchPomodoros` uses 5min)
  - Custom hooks in `hooks/` directory (`useMutations`, `useFeed`, `useLeaderboard`, `useUserProfile`)
- **Context API** for global auth state (`AuthContext`)
  - Provides: `user`, `session`, `userProfile`, `loading`
  - Single source of truth for authentication
- Local component state for UI (useState)

### Component Organization

```
src/
├── components/       # Presentational + container components
├── container/        # Page-level components (Home, DoroWrapper)
├── contexts/         # React Context providers (AuthContext)
├── hooks/            # Custom hooks (queries, mutations, business logic)
├── lib/              # Non-React utilities (Supabase client, queries, storage)
├── types/            # TypeScript types (models.ts, supabase.ts)
└── utils/            # Pure utility functions
```

### Key Patterns

- **Custom hooks for data fetching** - Encapsulate React Query logic (`useLikeMutation`, `useFollowMutation`)
- **Query invalidation** - Mutations invalidate related queries (e.g., liking invalidates feed, pomodoro detail)
- **Optimistic updates** - Not currently implemented but structure supports it
- **Protected routes** - Auth check in `AppRoutes` with loading state
- **Prop drilling avoided** - Use contexts for deeply nested data (auth)

---

## Database Architecture

### Core Tables

- **users** - User profiles (linked to Supabase Auth via FK)
- **pomodoros** - Task sessions (launch_at, task, notes, completed, image_url)
- **likes** - Pomodoro likes (many-to-many with unique constraint)
- **comments** - Pomodoro comments
- **follows** - User relationships (follower_id, following_id)
- **follow_requests** - Pending follow requests (for private accounts)
- **blocks** - User blocks (blocker_id, blocked_id)

### RLS (Row-Level Security)

- Enforced on all tables
- Privacy-aware: public users visible to all, private users only to followers
- Feed queries filtered by:
  - User privacy settings
  - Follow relationships
  - Block relationships (app-level + RLS)
- Functions in DB: `search_users`, `get_suggested_users`, `is_following`, etc.

### Data Flow

1. Component calls custom hook (`useFeed()`)
2. Hook uses React Query to call function in `lib/queries.ts`
3. Query function calls Supabase client with `.select()` + joins
4. RLS policies filter at DB level
5. Application-level filtering for blocks (checks blocks table)
6. Data cached by React Query with configured staleTime

---

## Testing Patterns

### Setup

- **Framework:** Vitest (Vite-native test runner)
- **DOM:** jsdom environment
- **Assertions:** @testing-library/jest-dom matchers
- **Setup file:** `src/__tests__/setup.ts` (cleanup + matchMedia mock)

### Testing Strategy

#### Component Tests (in `__tests__/` directories)

```typescript
// Pattern: Render with providers + mocks
const renderWithAuth = (user = mockUser) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={{ user, loading: false }}>
          <Component />
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
```

#### Key Testing Practices

- **Mock Supabase client** - `vi.mock('../../lib/supabaseClient')`
- **Mock query functions** - `vi.mock('../../lib/queries')`
- **Test query client per test** - Prevent cache pollution between tests
- **Provider wrapper** - AuthContext + QueryClientProvider + Router
- **User interactions** - `userEvent` from @testing-library/user-event
- **Async assertions** - `waitFor()`, `findBy*()` queries
- **Mock data structure** - Match database schema (joins, relations)

#### Test Organization

```
Component.tsx
__tests__/
  Component.test.tsx      # Component tests
  Component.integration.test.tsx  # Integration tests (if needed)
```

#### CSS Testing

- See `.github/instructions/css-testing.instructions.md` for CSS-specific testing guidelines
- Validate Tailwind classes, computed styles, responsive behavior

### Mocking Strategy

- **Supabase:** Mock entire client module
- **Storage:** Mock `getImageSignedUrl` to return static URLs
- **Query functions:** Mock with predefined return values
- **External services:** Mock at module boundary

---

## Key Features Implementation

### Authentication

- Google OAuth via `@react-oauth/google`
- Supabase Auth session management
- User profile synced to `users` table
- AuthContext manages session state

### Privacy System

- **Followers Only setting:** Controlled by `followers_only` boolean column
  - `followers_only = false`: Pomodoros appear in global feed, anyone can follow instantly
  - `followers_only = true`: Requires follow approval, pomodoros only visible to approved followers
- **Follow requests:** Stored in `follow_requests` table (for users with `followers_only = true`)
- **Blocks:** Hard filter (blocker can't see blocked user's content, bidirectional)

### Feed

- **Two feed types:**
  - `global`: Shows all pomodoros from users with `followers_only = false`
  - `following`: Shows only pomodoros from users you follow (or your own)
- Feed type controlled via URL param `?feed=global` or `?feed=following`
- Completed pomodoros only
- Filtered by:
  1. RLS policies (privacy + follows)
  2. Blocks (application level, bidirectional)
- Sorted by created_at DESC
- Pagination support

### Leaderboards

- Global (top performers by pomodoro count)
- Friends (users you follow)
- Compact version for dashboard
- Week/month/all-time filtering

### Storage

- **Supabase Storage** for pomodoro images
- **Bucket:** `pomodoro-images` (private bucket, requires signed URLs)
- **File Structure:** Images stored as `userId/timestamp.ext` (e.g., `user-123/1234567890.jpg`)
- **Database:** Path stored in `pomodoros.image_url` column (not full URL)
- **RLS Policies:** Storage bucket policies match pomodoros table policies:
  - Users can read their own images
  - Users can read images from users they follow (if not blocked)
  - Users can read images from users with `followers_only = false` (if not blocked)
- **Signed URLs:** Generated on-demand via `getImageSignedUrl()` (expires in 1 hour by default)
- **Helpers:** `lib/storage.ts` provides:
  - `uploadPomodoroImage()` - Uploads file, returns path (not URL)
  - `getImageSignedUrl()` - Generates signed URL from stored path
  - `deletePomodoroImage()` - Deletes image from storage
- **Display Flow:**
  1. Component receives `image_url` path from database
  2. `useEffect` calls `getImageSignedUrl()` to generate signed URL
  3. Signed URL used in `<img src>` tag
  4. URLs expire after 1 hour, component regenerates on mount
- **Note:** Images are currently rendered at full size (no resizing/thumbnails)

---

## Migration Notes

- **From:** Sanity CMS
- **To:** Supabase
- **Migration scripts:** `archive/scripts/`
  - `export-from-sanity.ts` - Extract data from Sanity
  - `import-to-supabase.ts` - Import to Supabase
  - `download-sanity-images.ts` - Migrate images

---

## Query Patterns

### Standard Query

```typescript
export async function getFeed(
  limit = 20,
  currentUserId?: string,
  feedType: "global" | "following" = "global"
) {
  let query = supabase
    .from("pomodoros")
    .select(
      `
      *,
      users:user_id (*),
      likes (id, user_id, users:user_id (id, user_name, avatar_url)),
      comments (id, comment_text, user_id, users:user_id (id, user_name, avatar_url))
    `
    )
    .eq("completed", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  // Application-level filtering:
  // - Feed type (global vs following)
  // - Blocks (bidirectional)
  return { data, error };
}
```

### Mutation Pattern

```typescript
export function useLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pomodoroId, userId }) => {
      const { data, error } = await supabase
        .from("likes")
        .insert({ pomodoro_id: pomodoroId, user_id: userId });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["pomodoro", variables.pomodoroId],
      });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
```

---

## File Conventions

- **Components:** PascalCase (`DoroDetail.tsx`)
- **Hooks:** camelCase with `use` prefix (`useFeed.ts`)
- **Utils/Lib:** camelCase (`queries.ts`, `supabaseClient.ts`)
- **Types:** camelCase (`models.ts`, `supabase.ts`)
- **Tests:** `*.test.tsx` or `*.test.ts` in `__tests__/` directories
- **Migrations:** `YYYYMMDDHHMMSS_description.sql`

---

## Development Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm test             # Run tests (watch mode)
npm test -- --run    # Run tests once
```

---

## Important Notes for LLMs

1. **Always wrap components requiring auth in AuthContext.Provider for tests**
2. **Mock Supabase at module level, not implementation level**
3. **Use `createTestQueryClient()` with retry: false for tests**
4. **RLS handles most data filtering, but blocks need app-level checks**
5. **Query invalidation is critical - update all related queries after mutations**
6. **Follow the provider wrapper pattern for all component tests**
7. **User ID comes from Supabase Auth, profiles in users table**
8. **Privacy + follows + blocks all affect what queries return**
9. **Feed supports two types: `global` (users with `followers_only = false`) and `following` (followed users only)**
10. **Privacy is controlled by `followers_only` boolean column (false = visible in global feed, true = followers-only)**
