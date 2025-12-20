---
name: Testing Instructions
description: Guidelines for writing tests with Vitest and React Testing Library.
applyTo: "**/*.test.js"
---

# Testing Instructions

## Framework

- **Vitest** for test runner
- **React Testing Library** for component testing
- **jsdom** for browser environment simulation

## Quick Start

```bash
npx vitest --ui    # Open Vitest UI (recommended)
npx vitest         # Run tests in terminal
npx vitest --watch # Watch mode
```

## What to Test

### Component Functionality

- **User interactions**: Buttons, forms, navigation work as expected
- **Data display**: Components render correct content
- **State changes**: UI updates when data changes
- **Error handling**: Components handle failures gracefully

### Focus Areas

- Authentication flows (login/logout UI)
- Pomodoro creation and display
- Like and comment interactions
- Follow/unfollow button behavior
- Leaderboard rendering
- Search and profile navigation

## Testing Principles

- Test **user-facing behavior**, not implementation
- Use `screen.getByRole()` and semantic queries
- Avoid testing internal state or mocks when possible
- Focus on "what users see and do"
