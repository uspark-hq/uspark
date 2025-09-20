# Bad Code Smells

This document defines code quality issues and anti-patterns to identify during code reviews.

## 1. Mock Analysis
- Identify new mock implementations
- Suggest non-mock alternatives where possible
- List all new mocks for user review
- Flag fetch API mocking in tests (should use MSW for network mocking instead)

## 2. Test Coverage
- Evaluate test quality and completeness
- Check for missing test scenarios
- Assess test maintainability

## 3. Error Handling
- Identify unnecessary try/catch blocks
- Suggest fail-fast improvements
- Flag over-engineered error handling

## 4. Interface Changes
- Document new/modified public interfaces
- Highlight breaking changes
- Review API design decisions

## 5. Timer and Delay Analysis
- Identify artificial delays and timers in production code
- **PROHIBIT fakeTimer/useFakeTimers usage in tests** - they mask real timing issues
- Flag timeout increases to pass tests
- Suggest deterministic alternatives to time-based solutions
- Tests should handle real async behavior, not manipulate time

## 6. Dynamic Import Analysis
- Identify dynamic `import()` calls that could be static imports
- Convert runtime dynamic imports to static imports at file top
- Preserve type-only imports (JSDoc/TypeScript annotations)
- Flag unnecessary async operations from dynamic imports

## 7. Database and Service Mocking in Web Tests
- Tests under `apps/web` should NOT mock `globalThis.services`
- Use real database connections for tests - test database is already configured
- Avoid mocking `globalThis.services.db` - use actual database operations
- Test environment variables are properly set up for database access
- Real database usage ensures tests catch actual integration issues

## 8. Test Mock Cleanup
- All test files MUST call `vi.clearAllMocks()` in `beforeEach` hooks
- Prevents mock state leakage between tests
- Eliminates flaky test behavior from persistent mock state
- Example:
  ```typescript
  beforeEach(() => {
    vi.clearAllMocks();
  });
  ```

## 9. TypeScript `any` Type Usage
- Project has zero tolerance for `any` types
- Use `unknown` for truly unknown types and implement proper type narrowing
- Define proper interfaces for API responses and data structures
- Use generics for flexible typing instead of `any`
- `any` disables TypeScript's type checking and should never be used

## 10. Artificial Delays in Tests
- Tests should NOT contain artificial delays like `setTimeout` or `await new Promise(resolve => setTimeout(resolve, ms))`
- Artificial delays cause test flakiness and slow CI/CD pipelines
- **DO NOT use `vi.useFakeTimers()` or mock timers** - handle real async behavior properly
- Use proper event sequencing and async/await instead of delays
- Delays and fake timers mask actual race conditions that should be fixed

## 11. Hardcoded URLs and Configuration
- Never hardcode URLs or environment-specific values
- Use centralized configuration from `env()` function
- Avoid hardcoded fallback URLs like `"https://uspark.dev"`
- Server-side code should not use `NEXT_PUBLIC_` environment variables
- All configuration should be environment-aware

## 12. Direct Database Operations in Tests
- Tests should use API endpoints for data setup, not direct database operations
- Direct DB operations duplicate business logic from API endpoints
- Makes tests brittle when schema or business logic changes
- Example - use API instead of direct DB:
  ```typescript
  // ❌ Bad: Direct database operation
  await db.insert(PROJECTS_TBL).values({ id, userId, name });

  // ✅ Good: Use API endpoint
  await POST("/api/projects", { json: { name } });
  ```

