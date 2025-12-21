---
name: CSS Testing Instructions
description: Guide for writing CSS-related tests to validate styling behavior
applyTo: "**/*.test.{ts,tsx}"
---

# CSS Testing Instructions

## Objective

Write tests to verify that critical CSS and styling behaviors work correctly across the Doros app. Focus on **functional CSS** that affects user experience, not cosmetic details.

## Setup Requirements

All CSS tests should:

- Use **Vitest** + **React Testing Library**
- Import `@testing-library/jest-dom` for matchers like `toHaveClass()`, `toHaveStyle()`, `toBeVisible()`
- Mock Supabase client to avoid real API calls
- Test components in isolation when possible

## What to Test

### 1. Conditional Visibility & Display States

**Components to test:**

- Modals (open/closed states)
- Dropdowns and menus
- Loading spinners
- Error messages
- Toast notifications

**Example test structure:**

```typescript
describe("Modal visibility", () => {
  it("is hidden when isOpen is false", () => {
    render(<Modal isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is visible when isOpen is true", () => {
    render(<Modal isOpen={true} />);
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
```

### 2. Interactive State Styles

**Components to test:**

- Buttons (disabled, loading, active states)
- Form inputs (focus, error, disabled states)
- Follow/Unfollow button states
- Like button states

**Example test structure:**

```typescript
describe("FollowButton states", () => {
  it("shows disabled styling when isFollowing is updating", () => {
    render(<FollowButton userId="123" isUpdating={true} />);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
  });
});
```

### 3. Conditional Class Application

**Components to test:**

- Timer (active vs paused styling)
- Doro cards (different priority levels or styles)
- Active navigation items
- User profile badges/status

**Example test structure:**

```typescript
describe("Timer styling", () => {
  it("applies active classes when timer is running", () => {
    render(<Timer isActive={true} seconds={1500} />);
    const timer = screen.getByTestId("timer-display");

    expect(timer).toHaveClass("text-red-500", "font-bold");
  });

  it("applies paused classes when timer is stopped", () => {
    render(<Timer isActive={false} seconds={1500} />);
    const timer = screen.getByTestId("timer-display");

    expect(timer).toHaveClass("text-gray-500");
  });
});
```

### 4. Layout & Responsive Behavior

**Components to test:**

- Navbar (mobile menu toggle)
- Sidebar (collapsed/expanded states)
- Leaderboard (grid/list view switching)
- Card layouts

**Example test structure:**

```typescript
describe("Navbar responsive behavior", () => {
  it("applies mobile menu classes", () => {
    render(<Navbar />);
    const mobileMenu = screen.getByTestId("mobile-menu");

    expect(mobileMenu).toHaveClass("md:hidden");
  });
});
```

### 5. Loading & Error States

**Components to test:**

- Spinner visibility during data fetching
- Skeleton loaders
- Error message styling
- Empty state displays

**Example test structure:**

```typescript
describe("Feed loading states", () => {
  it("shows spinner while loading", () => {
    render(<Feed isLoading={true} doros={[]} />);
    expect(screen.getByTestId("spinner")).toBeVisible();
  });

  it("hides spinner when loaded", () => {
    render(<Feed isLoading={false} doros={mockDoros} />);
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });
});
```

## Priority Components for CSS Testing

### High Priority

1. **Timer** - Active/paused/completed states
2. **FollowButton** - Following/unfollowing/disabled states
3. **Modal/CreateDoro** - Open/close visibility
4. **Navbar** - Mobile menu toggle, active links
5. **Login** - Form validation styling

### Medium Priority

6. **Doro cards** - Different style variants
7. **Leaderboard** - Active user highlighting
8. **UserProfile** - Stats display, follow status
9. **Feed** - Loading/empty/error states
10. **Search** - Results visibility, no results state

### Low Priority

11. **TimerBanner** - Display states
12. **Sidebar** - Collapsed/expanded
13. **CompactLeaderboard** - Responsive layout

## Testing Patterns

### Pattern 1: Visibility Toggle

```typescript
it('toggles visibility based on prop', () => {
  const { rerender } = render(<Component visible={false} />);
  expect(screen.queryByRole('...'')).not.toBeInTheDocument();

  rerender(<Component visible={true} />);
  expect(screen.getByRole('...')).toBeVisible();
});
```

### Pattern 2: Conditional Classes

```typescript
it("applies correct classes for state", () => {
  render(<Component state="active" />);
  expect(screen.getByRole("...")).toHaveClass(
    "expected-class",
    "another-class"
  );
  expect(screen.getByRole("...")).not.toHaveClass("inactive-class");
});
```

### Pattern 3: Computed Styles (use sparingly)

```typescript
it("renders with correct computed style", () => {
  render(<Component />);
  expect(screen.getByRole("...")).toHaveStyle({ display: "flex" });
});
```

## Best Practices

### ✅ DO

- Test functional CSS that affects UX (visibility, disabled states, etc.)
- Use `toHaveClass()` for Tailwind class verification
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test state transitions (hidden → visible, disabled → enabled)
- Focus on accessibility-related styling (focus states, aria-hidden)

### ❌ DON'T

- Test exact color values or pixel dimensions
- Test every Tailwind class on every component
- Test CSS that doesn't affect functionality
- Rely on `getByTestId()` unless necessary
- Test implementation details (CSS-in-JS internals)

## File Organization

Create test files adjacent to components:

```
src/components/
  ├── Timer.tsx
  ├── Timer.test.tsx          # ← Add CSS tests here
  ├── FollowButton.tsx
  ├── FollowButton.test.tsx   # ← Add CSS tests here
  └── __tests__/
      └── Feed.test.tsx       # ← Or in __tests__/ folder
```

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# UI mode (recommended)
npx vitest --ui

# Run specific test file
npx vitest Timer.test.tsx
```

## Success Criteria

A good CSS test should:

1. **Fail** when the styling behavior breaks
2. **Pass** when the styling works correctly
3. **Be readable** - clear what behavior is being tested
4. **Be maintainable** - not brittle to small CSS changes
5. **Test user-facing behavior** - not implementation details

## Example Complete Test Suite

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FollowButton } from "./FollowButton";

// Mock Supabase
vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

describe("FollowButton CSS behavior", () => {
  it("shows default button styles when not following", () => {
    render(<FollowButton userId="123" isFollowing={false} />);
    const button = screen.getByRole("button", { name: /follow/i });

    expect(button).toBeEnabled();
    expect(button).toHaveClass("bg-blue-500");
  });

  it("shows following state styles", () => {
    render(<FollowButton userId="123" isFollowing={true} />);
    const button = screen.getByRole("button", { name: /following/i });

    expect(button).toHaveClass("bg-gray-300");
  });

  it("shows disabled styles when updating", () => {
    render(<FollowButton userId="123" isUpdating={true} />);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
  });

  it("shows loading spinner during update", () => {
    render(<FollowButton userId="123" isUpdating={true} />);
    expect(screen.getByTestId("spinner")).toBeVisible();
  });
});
```

## Next Steps

1. Start with **FollowButton** and **Timer** components (highest impact)
2. Add tests to existing test files or create new ones
3. Run tests frequently: `npm run test:watch`
4. Ensure all tests pass before committing
5. Gradually expand coverage to medium/low priority components
