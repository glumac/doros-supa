# Frontend Development Conventions

## Core Principles

### 1. React Query (Mandatory)

- **Always use React Query** for all server state management
- **Never** make direct Supabase calls in components
- **Never** use `useState` + `useEffect` for data fetching
- All data fetching must go through custom hooks in `hooks/` directory

**Pattern:**

```typescript
// ✅ CORRECT: Use custom hook
const { data, isLoading, error } = useFeed(20, user?.id);

// ❌ WRONG: Direct Supabase call
const [data, setData] = useState([]);
useEffect(() => {
  supabase.from("pomodoros").select().then(setData);
}, []);
```

### 2. Data Fetching Architecture

**Query Functions** (`lib/queries.ts`):

- Return `{ data, error }` structure
- Handle Supabase queries and transformations
- No React hooks in query functions

**Custom Hooks** (`hooks/`):

- Wrap `useQuery` or `useMutation` from React Query
- Handle error throwing: `if (error) throw error;`
- Use hierarchical query keys: `["feed"]`, `["user", "profile", userId]`
- Set appropriate `enabled` conditions
- Configure `staleTime` per hook if needed

**Mutations**:

- Always invalidate related queries in `onSuccess`
- Use `queryClient.invalidateQueries({ queryKey: [...] })`
- Invalidate all affected query keys (feed, profile, leaderboard, etc.)

### 3. Component Structure

**Directory Organization:**

- `components/` - Presentational and reusable components
- `container/` - Page-level container components
- `hooks/` - Custom React Query hooks (one hook per file)
- `lib/` - Non-React utilities (Supabase client, query functions)
- `types/` - TypeScript type definitions
- `contexts/` - React Context providers (AuthContext only)

**Component Patterns:**

- Extract business logic to custom hooks
- Keep components focused on rendering
- Use TypeScript interfaces for props
- Export components via `components/index.ts` when needed
- Use "cq-" namespacing to give semantic classnames to elements that can be used testing and AI agent queries

### 4. Testing Conventions

**Framework:**

- Vitest for test runner
- React Testing Library for component testing
- `@testing-library/jest-dom` for matchers

**Test Structure:**

```typescript
// Always wrap with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={{ user, loading: false }}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
```

**Testing Principles:**

- Test **user-facing behavior**, not implementation details
- Use semantic queries: `getByRole`, `getByLabelText`, `getByText`
- Mock Supabase client: `vi.mock('../../lib/supabaseClient')`
- Mock query functions: `vi.mock('../../lib/queries')`
- Use `waitFor()` for async assertions
- Use `userEvent` for user interactions

**Test File Location:**

- Place tests in `__tests__/` subdirectory or adjacent to component
- Name: `ComponentName.test.tsx`

### 5. Styling

- **Tailwind CSS only** - no inline styles
- Use Tailwind utility classes
- Custom colors/utilities defined in `tailwind.config.js`
- Test CSS behavior when it affects functionality (visibility, disabled states)

### 6. TypeScript

- **Strict typing** throughout
- Use generated Supabase types from `types/supabase.ts`
- Define component prop interfaces
- Type all function parameters and return values
- Use `Database` type from Supabase for table types

### 7. Error Handling

**Query Functions:**

- Return `{ data, error }` structure
- Let React Query handle error state

**Custom Hooks:**

- Throw errors: `if (error) throw error;`
- React Query exposes `isError` and `error` to components

**Components:**

- Handle loading: `isLoading` or `isPending`
- Handle errors: `isError` with error display
- Show appropriate UI states (loading spinner, error message)

### 8. Code Organization

**File Naming:**

- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` (e.g., `useFeed.ts`)
- Utilities: `camelCase.ts`
- Types: `camelCase.ts` (e.g., `models.ts`)

**Imports:**

- Group imports: React, third-party, local components, hooks, types, utils
- Use absolute imports when possible (configured in `tsconfig.json`)

**Query Key Structure:**

- Use hierarchical arrays: `["feed"]`, `["user", "profile", userId]`
- Include all variables that affect the query in the key
- Be consistent across the codebase

### 9. Mutation Best Practices

**Always Invalidate:**

- After mutations, invalidate all affected queries
- Common patterns:
  - Like/Unlike → invalidate `["feed"]`, `["pomodoro", id]`, `["user", "pomodoros"]`
  - Follow/Unfollow → invalidate `["leaderboard"]`, `["user", "profile"]`, `["feed"]`
  - Create Pomodoro → invalidate `["feed"]`, `["leaderboard"]`, `["user", "pomodoros"]`

**Example:**

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({
    queryKey: ["pomodoro", variables.pomodoroId],
  });
  queryClient.invalidateQueries({ queryKey: ["user", "pomodoros"] });
};
```

### 10. Component Testing Checklist

When writing tests, ensure:

- ✅ Component renders without errors
- ✅ User interactions work (clicks, typing, navigation)
- ✅ Loading states display correctly
- ✅ Error states display correctly
- ✅ Data displays correctly when loaded
- ✅ Mutations update UI correctly
- ✅ Query invalidation works (verify with spies)

---

## Quick Reference

**Create a new query hook:**

1. Add query function to `lib/queries.ts` (returns `{ data, error }`)
2. Create hook in `hooks/useXxx.ts` wrapping `useQuery`
3. Use in component: `const { data, isLoading } = useXxx(params)`

**Create a new mutation hook:**

1. Add mutation function to `lib/queries.ts` or use Supabase directly
2. Create hook in `hooks/useMutations.ts` wrapping `useMutation`
3. Invalidate related queries in `onSuccess`
4. Use in component: `const mutation = useXxxMutation(); mutation.mutate(data)`

**Write a test:**

1. Create test file: `ComponentName.test.tsx`
2. Mock Supabase/queries: `vi.mock('../../lib/supabaseClient')`
3. Create wrapper with QueryClientProvider + AuthContext + Router
4. Test user behavior, not implementation
5. Use `waitFor()` for async operations
