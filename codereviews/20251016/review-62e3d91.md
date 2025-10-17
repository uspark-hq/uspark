# Code Review: 62e3d91 - feat: redirect to /projects/:id/init page after GitHub project creation

## Summary

This commit refactors the project creation flow to redirect to a dedicated `/projects/:id/init` page after GitHub project creation, rather than showing scan progress inline on the `/projects/new` page. The change:

1. Creates a new page at `/projects/[id]/init/page.tsx` that displays scan progress and handles auto-redirect when complete
2. Adds comprehensive unit tests for the new init page (`/projects/[id]/init/__tests__/page.test.tsx`)
3. Removes scan progress polling logic from the `/projects/new` page - now it simply redirects after project creation
4. Updates the E2E test to verify the redirect and init page functionality
5. Simplifies the new project page by removing the "scanning" step

## Bad Code Smell Analysis

### 1. ✅ Mock Analysis
**No issues found**

The changes use MSW (Mock Service Worker) appropriately for API mocking in tests:
- `/projects/[id]/init/__tests__/page.test.tsx` uses MSW handlers correctly via `server.use()`
- No inappropriate fetch API mocking detected
- Mock implementations are reasonable for testing UI states
- E2E tests now test real behavior by clicking "Start Scanning" button

### 2. ✅ Test Coverage
**No issues found**

Test coverage is comprehensive:
- New init page has 6 test cases covering:
  - Loading state
  - Scan progress display
  - Project not found error
  - Fetch failure error
  - Auto-redirect on scan completion
  - Auto-redirect on scan failure
  - Immediate redirect if already completed
- E2E test updated to verify redirect and init page rendering
- Tests cover both success and failure paths
- Tests verify auto-redirect behavior

### 3. ✅ Error Handling
**No issues found**

Error handling follows project principles:
- No unnecessary try/catch blocks
- Errors are handled at appropriate levels:
  - Line 365-368 in `page.tsx`: Catches fetch errors and sets error state (meaningful handling for UI)
  - Line 408-410: Silently ignores polling errors (acceptable for background polling)
- Fail-fast approach maintained - errors are displayed to user immediately
- No defensive programming anti-patterns

### 4. ✅ Interface Changes
**No issues found**

No public API or interface changes:
- New page component is internal to the app
- No changes to public API endpoints
- Internal routing change only
- Component props use existing types from `@uspark/core`

### 5. ⚠️ Timer and Delay Analysis
**ISSUES FOUND**

**Line 316 in `/turbo/apps/web/app/projects/[id]/init/page.tsx`:**
```typescript
const SCAN_POLL_INTERVAL_MS = 3000;
```

**Line 388-411:** Uses `setInterval` for polling scan progress:
```typescript
const interval = setInterval(async () => {
  try {
    const response = await fetch("/api/projects");
    if (response.ok) {
      const data = await response.json();
      const updatedProject = data.projects.find(
        (p: Project) => p.id === projectId,
      );
      if (updatedProject) {
        setProject(updatedProject);
        // Auto-redirect when scan completes (both success and failure)
        if (
          updatedProject.initial_scan_status === "completed" ||
          updatedProject.initial_scan_status === "failed"
        ) {
          clearInterval(interval);
          navigateToProject(updatedProject.id);
        }
      }
    }
  } catch {
    // Ignore polling errors
  }
}, SCAN_POLL_INTERVAL_MS);
```

**Analysis:**
- This polling mechanism is acceptable for production code monitoring long-running operations
- NOT a test timing issue
- Polling interval of 3 seconds is reasonable for monitoring scan progress
- Properly cleaned up with `clearInterval` in useEffect cleanup
- **Verdict: ACCEPTABLE** - This is production code polling for real async operations, not artificial test delays

**E2E Test Line 14:**
```typescript
await page.waitForURL(/\/projects\/[a-z0-9-]{36}\/init/, { timeout: 10000 });
```

**Analysis:**
- Custom timeout of 10000ms used in E2E test
- According to project guidelines in CLAUDE.md: "Use default timeouts - Tests should complete within default timeout limits. Never set custom timeouts"
- **Verdict: VIOLATION** - Custom timeout should be removed; test should use default Playwright timeout

### 6. ➖ Dynamic Import Analysis
**Not applicable to this commit**

No dynamic imports added or modified in this commit.

### 7. ✅ Database and Service Mocking in Web Tests
**No issues found**

Tests do not mock `globalThis.services` or database:
- Tests use MSW for API endpoint mocking (correct approach)
- No direct database mocking detected
- Tests interact with API layer, not database layer directly

### 8. ⚠️ Test Mock Cleanup
**ISSUES FOUND**

**File: `/turbo/apps/web/app/projects/[id]/init/__tests__/page.test.tsx`**

Missing `vi.clearAllMocks()` in `beforeEach` hook:
- Line 52-79: Has `beforeEach` but doesn't call `vi.clearAllMocks()`
- Uses mocks (`vi.mock("next/navigation")` on line 47)
- Should include mock cleanup to prevent state leakage

**Required fix:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Set up default handlers for this test suite
  server.use(
    // ... handlers
  );
});
```

### 9. ✅ TypeScript `any` Type Usage
**No issues found**

No usage of `any` type detected in the changes:
- All types properly defined
- Uses `Project` type from `@uspark/core`
- Type assertions are reasonable (e.g., `params.id as string`)
- Unknown type handling uses proper type guards

### 10. ✅ Artificial Delays in Tests
**No issues found**

No artificial delays or `useFakeTimers` in tests:
- Tests use `waitFor` with proper async conditions
- No `setTimeout` in test code
- No `vi.useFakeTimers()` usage
- All waiting is for actual UI state changes

### 11. ⚠️ Hardcoded URLs and Configuration
**ISSUES FOUND**

**Line 329 in `/turbo/apps/web/app/projects/[id]/init/page.tsx`:**
```typescript
const newUrl =
  currentUrl.origin.replace("www.", "app.") + `/projects/${id}`;
```

**Issue:**
- Hardcoded subdomain replacement logic (`www.` → `app.`)
- Assumes specific URL structure
- Not environment-aware configuration
- Should use centralized configuration from `env()` function

**Line 189-195, 260-266, 296-299 in test file:**
```typescript
expect(window.location.href).toBe(
  "https://app.example.com/projects/project-123",
);
```

**Analysis:**
- These are test assertions verifying redirect behavior
- Hardcoded URLs in test assertions are acceptable
- **Verdict: ACCEPTABLE for tests** - Tests need to assert specific values

**Overall verdict: VIOLATION in production code** - The subdomain replacement should use configuration.

### 12. ✅ Direct Database Operations in Tests
**No issues found**

No direct database operations in tests:
- Tests use API endpoints for all data operations
- MSW mocks API responses, not database layer
- No direct `db.insert`, `db.update`, or similar calls

### 13. ✅ Avoid Fallback Patterns
**No issues found**

No fallback patterns detected:
- Code fails appropriately when project not found (lines 349-353)
- Error states are set explicitly
- No silent fallback to defaults
- Follows fail-fast principle

### 14. ✅ Prohibition of Lint/Type Suppressions
**No issues found**

No suppression comments detected:
- No `eslint-disable` comments
- No `@ts-ignore` or `@ts-nocheck` comments
- No `@ts-expect-error` comments
- No `prettier-ignore` comments

### 15. ⚠️ Avoid Bad Tests
**ISSUES FOUND**

**1. Testing Specific UI Text Content (Line 93-95, 110-111, 124-125):**

```typescript
it("should display scan progress for running scan", async () => {
  render(<ProjectInitPage />);
  await waitFor(() => {
    expect(screen.getByText("Scanning test-repo")).toBeInTheDocument();
    expect(screen.getByText("Cloning repository")).toBeInTheDocument();
  });
});
```

**Issue:**
- Tests exact text content: "Scanning test-repo", "Cloning repository", "Project not found", "Failed to load project"
- According to bad-smell.md section 15: "Don't test exact heading text, button labels, or help text"
- "Test functionality and user flows, not marketing copy"
- These tests will break if text content changes

**Recommendation:**
Use `data-testid` attributes or test behavior instead of exact text.

**2. Testing Loading/Error States Without Logic (Lines 83-87, 98-112, 114-126):**

```typescript
it("should display loading state initially", async () => {
  render(<ProjectInitPage />);
  expect(screen.getByText("Loading project...")).toBeInTheDocument();
});

it("should display error when project not found", async () => {
  // ... setup mock
  render(<ProjectInitPage />);
  await waitFor(() => {
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });
});
```

**Issue:**
- Tests trivial rendering of loading/error states
- According to bad-smell.md: "Don't test that loading spinner appears - it's just conditional rendering"
- "Test the logic that causes these states, not the states themselves"

**Counter-argument:**
- The "project not found" and "failed to load" tests DO test logic (fetch failure handling)
- These are not just prop-based conditional rendering
- Loading state test is borderline - it's checking initial state before fetch completes

**Verdict: MINOR VIOLATION** - The loading state test is trivial, but error state tests have some value.

**3. E2E Test Line 22-24:**

```typescript
// Should show "Scanning {projectName}" heading
const scanningHeading = page.locator("h3").filter({ hasText: /Scanning/i });
await expect(scanningHeading).toBeVisible({ timeout: 5000 });
```

**Issue:**
- Custom timeout of 5000ms
- E2E test guidelines state: "Use default timeouts"

**Updated E2E Test (Lines 10-31):**
The E2E test was improved by:
- Now actually clicks "Start Scanning" button (previously skipped)
- Tests real project creation flow
- This is GOOD - tests actual behavior instead of stopping short

## Overall Assessment

- **Overall Quality:** Good
- **Risk Level:** Low
- **Recommended Actions:**
  1. **REQUIRED:** Remove custom timeout in E2E test (line 14) - use default Playwright timeout
  2. **REQUIRED:** Add `vi.clearAllMocks()` to `beforeEach` in `/turbo/apps/web/app/projects/[id]/init/__tests__/page.test.tsx`
  3. **RECOMMENDED:** Extract hardcoded subdomain logic to configuration (line 329 in `page.tsx`)
  4. **RECOMMENDED:** Refactor tests to use `data-testid` instead of exact text content
  5. **OPTIONAL:** Consider removing trivial loading state test
  6. **REQUIRED:** Remove custom timeout in E2E test (line 24) for `scanningHeading` visibility check

## Detailed Findings

### Positive Patterns Observed

1. **Good separation of concerns:** New dedicated init page simplifies the new project page
2. **Comprehensive test coverage:** New page has good test coverage for various scenarios
3. **Proper cleanup:** `setInterval` cleanup in useEffect return function
4. **Error handling:** Appropriate error states displayed to users
5. **E2E improvement:** Test now covers full flow instead of stopping before "Start Scanning"

### Architecture Notes

The redirect-based flow is cleaner than inline scanning:
- Separates project creation from scan monitoring
- Allows bookmarking the init page
- Better user experience with dedicated page
- Easier to test each page independently

### Polling Mechanism

The polling implementation (lines 374-414) is acceptable for this use case:
- Long-running operation (repository scanning)
- User needs progress updates
- Alternative would be WebSocket/SSE which adds complexity
- 3-second interval is reasonable balance between responsiveness and server load
- Properly handles cleanup and terminal states (completed/failed)

### Test Quality Improvements Needed

While test coverage is good, quality could be improved:
- Use semantic queries and test IDs instead of exact text
- Focus on user behavior rather than UI implementation details
- Remove custom timeouts in E2E tests
- Add proper mock cleanup

### Security Considerations

No security issues detected:
- No hardcoded secrets
- No unsafe DOM manipulation
- Proper URL construction (though should use config)
- Input validation handled by type system

## Conclusion

This is a solid refactoring that improves code organization and user experience. The main issues are:
1. Missing mock cleanup in tests (technical debt risk)
2. Custom timeouts in E2E test (violates guidelines)
3. Hardcoded subdomain logic (maintainability concern)
4. Tests relying on exact text content (brittleness)

All issues are straightforward to fix and the commit can be accepted after addressing the required changes.
