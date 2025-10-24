# Code Review: test: standardize msw configuration to error mode across all packages

**Commit:** 61970d0af7d5e3869adc367f603ecaf024a78b81
**Date:** Wed Oct 22 15:20:37 2025 -0700
**Author:** Ethan Zhang <ethan@uspark.ai>

## Summary

This commit standardizes Mock Service Worker (MSW) configuration across all packages to use strict `onUnhandledRequest: "error"` mode. The changes ensure consistent test behavior and early detection of missing request handlers.

**Key changes:**
- Updated MSW setup in `packages/core` from 'warn' to 'error' mode
- Updated MSW setup in `apps/web` from 'bypass' to 'error' mode (removed custom warning logging)
- Updated MSW browser setup in `apps/workspace` from 'bypass' to 'error' mode
- Added missing `/api/github/repositories` handler to global MSW handlers
- Fixed `contract-fetch-simple.test.ts` to use proper MSW mocking instead of expecting network failures
- Removed duplicate MSW server setup from `github-repo-selector.test.tsx`
- Updated `spec/tech-debt.md` to mark MSW issue as resolved

**Impact:** All 425 tests pass with zero MSW warnings. Tests now fail immediately if handlers are missing, preventing accidental real network calls.

## Review Against Bad Code Smells

### 1. Mock Analysis

**Status:** ✅ EXCELLENT - Proper MSW Usage

**New mocks added:**
1. **GitHub repositories endpoint handler** (`apps/web/src/test/msw-handlers.ts`)
   - Mock data: Returns array of 3 repository objects with realistic structure
   - Purpose: Replace inline test-specific mock that was duplicated in `github-repo-selector.test.tsx`
   - Alternative considered: N/A - MSW is the recommended approach for network mocking
   - **Assessment:** ✅ GOOD - Centralizing this mock in global handlers is the correct approach

2. **Contract fetch test handler** (`packages/core/src/__tests__/contract-fetch-simple.test.ts`)
   - Added MSW handler for `/api/users/:id` endpoint
   - Purpose: Replace expectation of network failures with proper mocking
   - **Assessment:** ✅ EXCELLENT - Tests should not rely on network failures; proper mocking is essential

**Removed mocks:**
- Removed duplicate MSW server setup from `github-repo-selector.test.tsx` (39 lines)
- Removed local repository mock data that's now in global handlers
- **Assessment:** ✅ EXCELLENT - Eliminates duplicate mock setup and leverages centralized handlers

**Mock quality analysis:**
```typescript
// Global handler for GitHub repositories
http.get("*/api/github/repositories", () => {
  return HttpResponse.json({
    repositories: [
      {
        id: 1,
        name: "repo-1",
        fullName: "owner1/repo-1",
        installationId: 123,
        private: false,
        url: "https://github.com/owner1/repo-1",
      },
      // ... more repos
    ],
  });
})
```
- ✅ Realistic data structure matching production API
- ✅ Covers different scenarios (public/private repos, different owners)
- ✅ Centralized in global handlers for reuse
- ✅ No fetch API mocking - uses MSW as recommended

**Verdict:** ✅ PASS - All mocks use MSW properly, no fetch API mocking, and centralizes handlers well.

### 2. Test Coverage

**Status:** ✅ EXCELLENT - Enhanced Test Quality

**New test added:**
```typescript
it("should build correct request URL with path params", async () => {
  server.use(
    http.get("https://api.example.com/api/users/:id", ({ params }) => {
      return HttpResponse.json({
        id: params.id as string,
        name: "Test User",
      });
    }),
  );

  const result = await contractFetch(simpleContract.getUser, {
    baseUrl: "https://api.example.com",
    params: { id: "user123" },
  });

  expect(result.id).toBe("user123");
  expect(result.name).toBe("Test User");
});
```

**Assessment:** ✅ EXCELLENT test addition
- Tests actual behavior (URL building with path params) instead of expecting failures
- Uses proper MSW handler with dynamic params
- Verifies both the request URL construction and response handling
- Not a "bad test" - tests real functionality, not mock behavior

**Test improvement in `github-repo-selector.test.tsx`:**
- Before: 39 lines of duplicate MSW setup, duplicating global handlers
- After: Relies on centralized global handlers, simpler test file
- **Impact:** ✅ EXCELLENT - Eliminates test duplication and maintenance burden

**Coverage quality:**
- ✅ All 425 tests pass with strict error mode
- ✅ Tests now fail immediately when handlers are missing
- ✅ No MSW warnings indicates complete handler coverage

**Verdict:** ✅ PASS - Test quality improved, new test is meaningful, and coverage is comprehensive.

### 3. Error Handling

**Status:** ✅ EXCELLENT - Fail-Fast Improvement

**Changes to error handling:**

1. **Removed custom warning logging in `apps/web/src/test/msw-setup.ts`:**
```typescript
// REMOVED:
server.events.on("request:unhandled", ({ request }) => {
  console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
});
```
**Assessment:** ✅ EXCELLENT - This custom warning was redundant with MSW's built-in error mode.

2. **Changed from 'bypass' to 'error' mode:**
```typescript
// Before:
server.listen({
  onUnhandledRequest: "bypass", // Let unhandled requests pass through
});

// After:
server.listen({
  onUnhandledRequest: "error",
});
```
**Assessment:** ✅ EXCELLENT - Fail-fast pattern
- Tests fail immediately when handlers are missing
- Prevents accidental real network calls in tests
- No silent bypassing of unhandled requests

3. **Changed from 'warn' to 'error' in core package:**
```typescript
// packages/core/src/test/msw-setup.ts
// Before: onUnhandledRequest: "warn"
// After: onUnhandledRequest: "error"
```
**Assessment:** ✅ EXCELLENT - Consistent fail-fast behavior across all packages

**Verdict:** ✅ PASS - Implements proper fail-fast pattern, eliminates silent failures, no unnecessary try/catch blocks.

### 4. Interface Changes

**Status:** ✅ PASS - No Breaking Changes

**Changes to public interfaces:** None

**Changes to test interfaces:**
- `contract-fetch-simple.test.ts`: Added new test case, no changes to existing tests
- `github-repo-selector.test.tsx`: Removed duplicate MSW setup, no changes to test assertions

**MSW configuration changes:**
- Changed `onUnhandledRequest` from 'warn'/'bypass' to 'error' in all packages
- This is an internal test configuration change, not a public API change

**Breaking changes:** None - All changes are test-internal

**Verdict:** ✅ PASS - No public interface changes, only test infrastructure improvements.

### 5. Timer and Delay Analysis

**Status:** N/A - No Timer Changes

No timers, delays, or time-based logic in this commit.

### 6. Dynamic Imports

**Status:** N/A - No Import Changes

No dynamic imports added or modified.

### 7. Database and Service Mocking in Web Tests

**Status:** ✅ PASS - No Database Mocking

This commit only touches MSW network mocking configuration. No changes to database or service mocking.

The changes in `apps/web` are to MSW HTTP handlers, not database mocking, which is appropriate.

### 8. Test Mock Cleanup

**Status:** ✅ EXCELLENT - Proper Mock Management

**Mock cleanup in `github-repo-selector.test.tsx`:**

Before (redundant setup):
```typescript
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  vi.clearAllMocks();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

After:
- Removed duplicate `beforeAll`, `afterEach`, `afterAll` hooks
- Now relies on global MSW setup from `src/test/msw-setup.ts`
- Still has `beforeEach(() => { vi.clearAllMocks(); })` for mock cleanup

**Assessment:** ✅ EXCELLENT
- Eliminates duplicate MSW server management
- Centralizes MSW lifecycle in global setup
- Maintains proper `vi.clearAllMocks()` in `beforeEach`

**New test in `contract-fetch-simple.test.ts`:**
```typescript
it("should build correct request URL with path params", async () => {
  server.use(
    http.get("https://api.example.com/api/users/:id", ({ params }) => {
      return HttpResponse.json({
        id: params.id as string,
        name: "Test User",
      });
    }),
  );
  // ... test code
});
```

**Note:** This test adds a runtime handler using `server.use()` but doesn't explicitly clean it up. However, this is acceptable because:
1. The global MSW setup has `afterEach(() => server.resetHandlers())` which cleans up runtime handlers
2. This is the recommended MSW pattern for test-specific handlers

**Verdict:** ✅ PASS - Proper mock cleanup maintained, duplicate setup removed.

### 9. TypeScript `any` Usage

**Status:** ✅ PASS - No `any` Types

No `any` types added in this commit. All code properly typed.

### 10. Artificial Delays in Tests

**Status:** ✅ PASS - No Delays

No `setTimeout`, `sleep`, or artificial delays added to tests.

### 11. Hardcoded URLs and Configuration

**Status:** ✅ PASS - Test-Appropriate URL Usage

**URLs in this commit:**

1. **Test handler URLs:**
```typescript
// In contract-fetch-simple.test.ts
http.get("https://api.example.com/api/users/:id", ...)
```
**Assessment:** ✅ ACCEPTABLE - This is a test URL in a mock handler, not production code. Using hardcoded test URLs in MSW handlers is appropriate.

2. **Mock repository URLs:**
```typescript
url: "https://github.com/owner1/repo-1"
```
**Assessment:** ✅ ACCEPTABLE - Mock data in test handlers, not production code.

**Verdict:** ✅ PASS - Hardcoded URLs are appropriate for test mock data.

### 12. Direct Database Operations in Tests

**Status:** N/A - No Database Operations

This commit doesn't add or modify any database operations in tests.

### 13. Fail Fast Pattern

**Status:** ✅ EXCELLENT - Implements Fail-Fast

**Fail-fast improvements:**

1. **Eliminated bypass mode:**
```typescript
// Before: Silent bypassing of unhandled requests
onUnhandledRequest: "bypass"

// After: Immediate failure on unhandled requests
onUnhandledRequest: "error"
```

2. **Removed custom warning fallback:**
```typescript
// REMOVED: Custom warning that allowed tests to continue
server.events.on("request:unhandled", ({ request }) => {
  console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
});
```

**Assessment:** ✅ EXCELLENT
- Tests now fail immediately when network handlers are missing
- No silent fallback behavior that could hide issues
- Prevents accidental real network calls in tests
- Aligns perfectly with fail-fast principle from bad-smell.md (#13)

**Quote from bad-smell.md:**
> "No fallback/recovery logic - errors should fail immediately and visibly"
> "Configuration errors should be caught during deployment, not hidden"

This commit applies the same principle to tests - missing mock handlers should fail immediately, not be bypassed or warned about.

**Verdict:** ✅ PASS - Excellent implementation of fail-fast pattern in test infrastructure.

### 14. Lint Suppressions

**Status:** ✅ PASS - No Suppressions Added

**Suppressions removed:**
```typescript
// contract-fetch-simple.test.ts
-// eslint-disable-next-line @typescript-eslint/no-unused-vars
-const simpleContract = c.router({
+const simpleContract = c.router({
```

**Assessment:** ✅ EXCELLENT - Removed unnecessary `no-unused-vars` suppression. The `simpleContract` is now actually used in the new test, making the suppression unnecessary.

**No new suppressions added.**

**Verdict:** ✅ PASS - Actually removed a suppression, maintaining zero-tolerance policy.

### 15. Bad Tests

**Status:** ✅ EXCELLENT - No Bad Test Patterns

Let's analyze the new test against bad test patterns:

**New test in `contract-fetch-simple.test.ts`:**
```typescript
it("should build correct request URL with path params", async () => {
  server.use(
    http.get("https://api.example.com/api/users/:id", ({ params }) => {
      return HttpResponse.json({
        id: params.id as string,
        name: "Test User",
      });
    }),
  );

  const result = await contractFetch(simpleContract.getUser, {
    baseUrl: "https://api.example.com",
    params: { id: "user123" },
  });

  expect(result.id).toBe("user123");
  expect(result.name).toBe("Test User");
});
```

**Analysis against bad test patterns:**

1. **Fake tests:** ❌ NOT PRESENT
   - Test exercises real `contractFetch` function
   - Not just testing mock behavior
   - ✅ PASS

2. **Duplicating implementation:** ❌ NOT PRESENT
   - Tests behavior: "URL building with path params works correctly"
   - Doesn't replicate URL building logic in assertions
   - ✅ PASS

3. **Over-testing error responses:** ❌ NOT PRESENT
   - Tests successful path, not HTTP status codes
   - ✅ PASS

4. **Over-testing schema validation:** ❌ NOT PRESENT
   - No Zod schema validation tests
   - ✅ PASS

5. **Over-mocking:** ❌ NOT PRESENT
   - Only mocks network layer (appropriate for MSW)
   - Tests real `contractFetch` logic
   - ✅ PASS

6. **Console output mocking:** ❌ NOT PRESENT
   - No console mocking
   - ✅ PASS

7. **Testing UI implementation details:** ❌ NOT PRESENT
   - Not a UI test
   - ✅ PASS

8. **Testing trivial states:** ❌ NOT PRESENT
   - Tests actual URL building logic
   - ✅ PASS

9. **Testing specific text content:** ❌ NOT PRESENT
   - Tests data values, but they're essential to verify the param was passed correctly
   - ✅ PASS

**Changes to `github-repo-selector.test.tsx`:**
- Removed duplicate MSW setup (good)
- No test logic changes
- ✅ PASS

**Verdict:** ✅ PASS - New test is well-written, tests real behavior, and adds value.

## Code Quality Analysis

### Standardization Benefits

This commit achieves excellent standardization across the monorepo:

**Before:**
- `packages/core`: `onUnhandledRequest: "warn"` - allowed tests to pass with warnings
- `apps/web`: `onUnhandledRequest: "bypass"` + custom warning event - allowed unhandled requests to pass through
- `apps/workspace`: `onUnhandledRequest: "bypass"` - allowed unhandled requests to pass through

**After:**
- All packages: `onUnhandledRequest: "error"` - consistent fail-fast behavior

**Benefits:**
1. ✅ **Immediate failure detection** - Tests fail immediately when handlers are missing
2. ✅ **Prevents silent bugs** - No more warnings that get ignored
3. ✅ **Consistency** - Same behavior across all packages
4. ✅ **No real network calls** - Prevents accidental external API calls in tests
5. ✅ **Better developer experience** - Clear error messages instead of warnings

### MSW Handler Centralization

**Before:** `github-repo-selector.test.tsx` had inline mock setup:
```typescript
const mockRepositories = [
  { id: 1, name: "repo-1", ... },
  { id: 2, name: "repo-2", ... },
  { id: 3, name: "repo-3", ... },
];

const server = setupServer(
  http.get("*/api/github/repositories", () => {
    return HttpResponse.json({ repositories: mockRepositories });
  }),
);

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }); });
afterEach(() => { server.resetHandlers(); });
afterAll(() => { server.close(); });
```

**After:** Handler moved to global `msw-handlers.ts`:
```typescript
// In global handlers
http.get("*/api/github/repositories", () => {
  return HttpResponse.json({
    repositories: [...], // Same mock data
  });
})

// Test file now much simpler - just relies on global setup
```

**Benefits:**
1. ✅ **DRY principle** - Mock data defined once, reused across tests
2. ✅ **Easier maintenance** - Update mock data in one place
3. ✅ **Simpler test files** - Less boilerplate
4. ✅ **Consistent responses** - All tests get same mock data

### Test Improvement: contract-fetch-simple.test.ts

**Before:** Test file only had type checking tests, no actual behavior tests:
```typescript
describe("contractFetch simple test", () => {
  it("should import contractFetch correctly", () => {
    expect(contractFetch).toBeDefined();
  });
  // ... more type-checking tests
});
```

**After:** Added meaningful behavior test:
```typescript
it("should build correct request URL with path params", async () => {
  // Actually tests URL building with path params
});
```

**Assessment:** ✅ EXCELLENT
- Previous tests were just import/type checks
- New test actually exercises the functionality
- Tests path parameter substitution, which is non-trivial
- Uses proper MSW mocking instead of expecting network failures

### Tech Debt Resolution

The commit properly updates `spec/tech-debt.md` to mark the MSW issue as resolved:

```markdown
**Status:** ✅ **RESOLVED** (October 22, 2025)

**Resolution:** Standardized MSW configuration across all packages to use `onUnhandledRequest: "error"` and fixed all unhandled requests

**Changes Made:**
- Updated all MSW setups to use "error" mode
- Added missing handler for `/api/github/repositories`
- Fixed tests to use proper MSW handlers
- Removed duplicate MSW server setup
```

**Assessment:** ✅ EXCELLENT
- Properly documents the resolution
- Lists all changes made
- Updates status and tracking sections
- Maintains history of the issue (keeps "Problem (Previously)" section)

## Verdict

**Status:** ✅ APPROVED - EXCELLENT QUALITY

**Key Strengths:**
1. ✅ **Perfect fail-fast implementation** - Error mode prevents silent failures
2. ✅ **Excellent standardization** - Consistent MSW configuration across all packages
3. ✅ **Proper MSW usage** - No fetch mocking, centralized handlers
4. ✅ **Code quality improvement** - Removed duplicate setup, added meaningful test
5. ✅ **Zero bad smells** - No suppressions, no `any` types, no bad test patterns
6. ✅ **Tech debt resolved** - Properly documented and tested (425 tests pass)
7. ✅ **Removed suppression** - Fixed `no-unused-vars` instead of suppressing it

**Impact Assessment:**
- ✅ All 425 tests pass with zero MSW warnings
- ✅ Tests now fail immediately if handlers are missing
- ✅ Prevents accidental real network calls in tests
- ✅ Consistent strict behavior across all packages

**No issues found** - This commit represents best practices in test infrastructure:
- Implements fail-fast pattern correctly
- Centralizes mock data
- Removes duplicate code
- Adds meaningful tests
- Resolves technical debt

## Recommendations

### None - This is exemplary code

This commit demonstrates:
1. **Proper fail-fast pattern** - Errors fail immediately and visibly
2. **DRY principle** - Mock data centralized and reused
3. **MSW best practices** - Centralized handlers, proper cleanup, error mode
4. **Test quality** - New test adds value, tests real behavior
5. **Documentation** - Tech debt properly marked as resolved

### Lessons for Future Work

This commit serves as a good example for:
1. **How to standardize test infrastructure** - Consistent configuration across packages
2. **How to centralize MSW handlers** - Move test-specific handlers to global setup when reusable
3. **How to implement fail-fast in tests** - Use `onUnhandledRequest: "error"` to catch missing handlers
4. **How to resolve tech debt** - Fix the issue, document the resolution, verify with tests

## Overall Assessment

This is a **high-quality test infrastructure improvement** that:
- Eliminates silent failures
- Standardizes behavior across packages
- Removes duplicate code
- Adds meaningful tests
- Resolves documented technical debt

**Recommendation: APPROVED** - This commit improves test reliability and maintainability with zero code smells. It should serve as an example for future test infrastructure work.

---

**Test Results:** ✅ 425 tests passed, 0 MSW warnings
**Pre-commit Checks:** ✅ All passed (lint, type-check, format, tests)
