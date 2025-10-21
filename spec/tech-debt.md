# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

> **Goal**: Achieve zero direct database operations in tests, proper test isolation, and strict type safety

## Test Mock Cleanup Issues
**Issue:** Tests don't explicitly call `vi.clearAllMocks()` in beforeEach hooks, which could lead to mock state leakage between tests.
**Source:** Code review commit 3d3a1ff
**Status:** ✅ **RESOLVED** (September 13, 2025)
**Solution:** Add proper mock cleanup in all test files:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Resolution:** Added `vi.clearAllMocks()` to all 17 test files that were missing mock cleanup ([PR #272](https://github.com/uspark-hq/uspark/pull/272)):

- ✅ `/turbo/apps/web/app/api/cli/auth/generate-token/route.test.ts`
- ✅ `/turbo/apps/web/app/api/cli/auth/tokens-list.test.ts`
- ✅ `/turbo/apps/web/app/api/github/setup/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/blob-token/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/api.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/route.api.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/sessions/route.test.ts`
- ✅ `/turbo/apps/web/app/api/projects/route.test.ts`
- ✅ `/turbo/apps/web/app/api/share/route.test.ts`
- ✅ `/turbo/apps/web/app/api/shares/[id]/route.test.ts`
- ✅ `/turbo/apps/web/app/api/shares/route.test.ts`

**Impact:** Eliminated risk of mock state leakage between tests, improving test reliability and preventing flaky behavior.

## Database Test Isolation Strategy
**Issue:** Tests share database state without proper isolation, which could cause race conditions and flaky tests when run in parallel.
**Source:** Code review commit 3d3a1ff
**Status:** ✅ **RESOLVED** (September 12, 2025)
**Resolution:** Implemented unique user IDs for all test files ([PR #261](https://github.com/uspark-hq/uspark/pull/261))

**Solution Implemented:**
All test files now use unique identifiers following the pattern:
```typescript
const userId = `test-user-{context}-${Date.now()}-${process.pid}`;
```

**Impact:**
- ✅ Eliminates race conditions between parallel test executions
- ✅ Prevents data pollution across test runs
- ✅ Maintains test stability regardless of execution order
- ✅ 16 test files updated with unique IDs

## TypeScript `any` Type Cleanup
**Issue:** Several files still contain `any` types which compromise type safety and violate project standards.
**Source:** Code review September 11-12, 2025
**Status:** 🟡 **Partially Fixed** (3 violations remaining, down from 5)
**Problem:** 
- Project has zero tolerance for `any` types per design principles
- `any` types disable TypeScript's type checking
- Makes refactoring risky and error-prone
- Reduces IDE autocomplete and IntelliSense effectiveness

**Specific Violations:**

**Production Code:** ✅ **FIXED** (September 12, 2025)
- `/turbo/apps/web/app/projects/page.tsx` - Refactored to use standard fetch API instead of contractFetch with any

**Test Code (3 violations remaining):**
1. `/turbo/apps/workspace/custom-eslint/__tests__/rules.test.ts`
   - Line 750: `type ToggleContext = { initContext$: any };`
   - Line 833: `let context: any`
   - Line 866: `let store: any, signal: any`

**Solution:**
1. **Use `unknown` for truly unknown types:**
   ```typescript
   // ❌ Bad
   function processData(data: any) { }
   
   // ✅ Good
   function processData(data: unknown) {
     // Type narrowing required before use
     if (typeof data === 'object' && data !== null) {
       // Now safely use data
     }
   }
   ```

2. **Define proper interfaces for API responses:**
   ```typescript
   // ❌ Bad
   const response: any = await fetch('/api/data');
   
   // ✅ Good
   interface ApiResponse {
     data: { id: string; name: string }[];
     status: 'success' | 'error';
   }
   const response: ApiResponse = await fetch('/api/data');
   ```

3. **Use generics for flexible typing:**
   ```typescript
   // ❌ Bad
   function getValue(obj: any, key: string): any { }
   
   // ✅ Good
   function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
     return obj[key];
   }
   ```

**Enforcement:**
- Add ESLint rule: `"@typescript-eslint/no-explicit-any": "error"`
- Pre-commit hook to reject new `any` types
- Gradual migration of existing `any` types

## Overuse of Try-Catch Blocks (Fail-Fast Principle Violation)
**Issue:** Excessive use of try-catch blocks in non-UI code where errors should fail fast rather than being caught.
**Status:** ✅ **RESOLVED** (September 12, 2025)
**Severity:** MEDIUM
**Resolution:** All unnecessary try-catch blocks have been removed following the fail-fast principle

**Files Reviewed and Fixed:**
- ✅ `/turbo/apps/web/app/api/github/installations/route.ts` - Clean, no unnecessary try-catch
- ✅ `/turbo/apps/web/app/api/github/webhook/route.ts` - Clean, no unnecessary try-catch
- ✅ `/turbo/apps/web/app/api/projects/[projectId]/blob-token/route.ts` - Clean, no defensive catches

**Note:** `/turbo/apps/web/app/api/github/setup/route.ts` has legitimate fallback behavior and correctly keeps its try-catch

## GitHub Sync Function Try-Catch Violation
**Issue:** Main sync function uses broad try-catch that masks error details instead of allowing specific failures to propagate.
**Source:** Code review commit 5744c7c - review-5744c7c.md
**Status:** ✅ **RESOLVED** (September 13, 2025)
**File:** `/turbo/apps/web/src/lib/github/sync.ts` (Lines 210-304)

**Problem:**
```typescript
try {
  // Complex multi-step sync process
  // ... validation, repository checks, file extraction, GitHub operations
  return { success: true, commitSha, filesCount, message };
} catch (error) {
  console.error("Sync error:", error);
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error occurred",
  };
}
```

**Violation of fail-fast principle:**
- Catches all errors generically instead of handling specific failure modes
- Obscures the actual failure point in the complex sync process
- Makes debugging sync issues difficult
- Prevents proper error propagation to calling code

**Solution Implemented:** ✅ Removed the broad try-catch block and let specific operations fail naturally, allowing errors to propagate to where they can be properly handled by the calling code.

## Timer Cleanup Issue
**Issue:** setTimeout usage without proper cleanup in React component can cause memory leaks and state updates on unmounted components.
**Source:** Code review commit 5744c7c - review-5744c7c.md
**Status:** ✅ **RESOLVED** (September 13, 2025)
**File:** `/turbo/apps/web/app/components/github-sync-button.tsx`

**Problem:**
```typescript
// Clear success message after 5 seconds
setTimeout(() => {
  setSyncStatus({ type: null, message: "" });
}, 5000);
```

**Issues:**
- No cleanup mechanism if component unmounts before timeout
- Can cause "setState on unmounted component" warnings
- Memory leak from uncanceled timeout
- Potential state corruption if component remounts

**Solution Implemented:** Use useEffect with cleanup:
```typescript
useEffect(() => {
  if (syncStatus.type === 'success') {
    const timeoutId = setTimeout(() => {
      setSyncStatus({ type: null, message: "" });
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }
}, [syncStatus.type]);
```

**Resolution:** Timer now properly cleans up when component unmounts, preventing memory leaks and avoiding setState on unmounted component warnings.

## Hardcoded URL Configuration
**Issue:** Hardcoded URLs in API routes instead of using centralized configuration.
**Source:** Code review commit d50b99c
**Status:** ✅ **RESOLVED** (September 12, 2025)
**Resolution:** All hardcoded URLs have been fixed ([PR #259](https://github.com/uspark-hq/uspark/pull/259))

**Solution Implemented:**
- `/turbo/apps/web/app/api/cli/auth/device/route.ts` now uses `${env().APP_URL}/cli-auth`
- All API routes now use centralized environment configuration

## MSW Unhandled Requests in Tests
**Issue:** Tests using MSW (Mock Service Worker) have unhandled HTTP requests that pass through without being intercepted.
**Source:** Code review October 2025
**Status:** 🔴 **ACTIVE**
**Severity:** MEDIUM
**Problem:**
- MSW warns about unhandled requests but tests still pass
- Indicates missing or incorrect request handlers
- Tests may be making real network calls instead of using mocks
- Can cause flaky tests if actual network is unavailable
- Makes it unclear whether mocks are working correctly

**Detection:**
Look for MSW warnings in test output:
```
stderr | test file
[MSW] Unhandled GET request to http://localhost:3000/api/github/repositories
```

**Root Causes:**
1. **URL Pattern Mismatch**: Handler pattern doesn't match actual request URL
   ```typescript
   // ❌ Bad: Doesn't match localhost:3000
   http.get("/api/github/repositories", ...)

   // ✅ Good: Matches any host
   http.get("*/api/github/repositories", ...)

   // ✅ Also Good: Explicit full URL
   http.get("http://localhost:3000/api/github/repositories", ...)
   ```

2. **Missing Handlers**: Request made but no handler defined
3. **Wrong HTTP Method**: Handler is GET but request is POST

**Solution:**
1. **Use wildcard patterns for paths:**
   ```typescript
   const server = setupServer(
     http.get("*/api/github/repositories", () => {
       return HttpResponse.json({ repositories: [] });
     }),
   );
   ```

2. **Configure MSW to error on unhandled requests:**
   ```typescript
   beforeAll(() => {
     server.listen({ onUnhandledRequest: "error" });
   });
   ```

3. **Or bypass non-test requests silently:**
   ```typescript
   beforeAll(() => {
     server.listen({ onUnhandledRequest: "bypass" });
   });
   ```

**Best Practice:**
- Always verify MSW handlers are working by checking no unhandled request warnings
- Use `onUnhandledRequest: "error"` during development to catch misconfigurations
- Use `onUnhandledRequest: "bypass"` in CI if you have legitimate unhandled requests
- Each MSW-based test should have zero unhandled request warnings

**Files to Check:**
- Any test file importing `msw` or using `setupServer`
- Look for MSW warnings in test output

## Flaky E2E Tests Due to Deployment Timing
**Issue:** Web E2E tests (`web-e2e`) fail intermittently with network errors due to race conditions with Vercel preview deployment.
**Source:** PR #686 - October 21, 2025
**Status:** 🟡 **TEMPORARILY MITIGATED** (not properly fixed)
**Severity:** MEDIUM
**Problem:**
- E2E tests depend on Vercel preview deployment being fully ready
- Tests start as soon as deployment job completes, but Vercel URL may not be immediately available
- Causes `ERR_ABORTED` errors when navigating to pages
- Currently masked by enabling test retries (2 retries in CI)

**Specific Failing Tests:**
- `e2e/web/tests/github-onboarding.spec.ts`:
  - "displays onboarding page when user has no github installation" - Line 26: `page.goto("/onboarding/github")`
  - "projects page redirects to onboarding without github" - Line 94: `page.goto("/projects")`

**Error Symptoms:**
```
Error: page.goto: net::ERR_ABORTED at https://uspark-xxx.vercel.app/onboarding/github
Error: page.goto: net::ERR_ABORTED at https://uspark-xxx.vercel.app/projects
```

**Current Temporary Solution (NOT IDEAL):**
```typescript
// e2e/web/playwright.config.ts
retries: process.env.CI ? 2 : 0,  // Masks the problem with retries
```

**Why This Is Wrong:**
- Retries hide the root cause instead of fixing it
- Tests may still fail if all retries encounter the same timing issue
- Increases CI execution time unnecessarily
- Violates the principle that tests should be deterministic

**Proper Solution (TODO):**
1. **Add explicit deployment readiness check:**
   ```typescript
   // In CI workflow before running E2E tests
   async function waitForDeployment(url: string) {
     const maxAttempts = 30;
     for (let i = 0; i < maxAttempts; i++) {
       try {
         const response = await fetch(url);
         if (response.ok) return;
       } catch {}
       await new Promise(resolve => setTimeout(resolve, 2000));
     }
     throw new Error('Deployment not ready');
   }
   ```

2. **Add retry logic with exponential backoff in tests:**
   ```typescript
   // In test helpers
   async function gotoWithRetry(page: Page, url: string) {
     for (let i = 0; i < 3; i++) {
       try {
         await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
         return;
       } catch (error) {
         if (i === 2) throw error;
         await page.waitForTimeout(Math.pow(2, i) * 1000);
       }
     }
   }
   ```

3. **Add health check endpoint:**
   ```typescript
   // app/api/health/route.ts
   export async function GET() {
     return Response.json({ status: 'ready' });
   }
   ```

**Impact:**
- Tests are not truly reliable, failures are just hidden
- Developers may not notice real deployment issues
- Slower CI execution due to retry overhead

**Action Required:**
- Remove the retry band-aid solution
- Implement proper deployment readiness checks
- Add robust error handling in navigation helpers
- Set retries back to 0 once root cause is fixed

## Test Database Setup Refactoring
**Issue:** Tests in route.test.ts files heavily rely on manual database operations for setup, which duplicates logic already implemented in API endpoints.
**Problem:** 
- Manual database operations in tests duplicate business logic from API endpoints
- Makes tests brittle when database schema or business logic changes
- Increases maintenance burden when API logic changes
**Solution:** Refactor tests to reuse existing API endpoints for data setup instead of direct database manipulation.
**Status:** 🟡 In Progress (33% improvement)
**Progress:** Reduced from 18+ files to 12 files as of December 2024

### Current Status (December 2024)

#### Files Still Using Direct Database Operations (12 files)

**High Priority (Core API Tests):**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/projects/route.test.ts` | 116 | Direct DB insert | Create test helper using API |
| `apps/web/app/api/projects/[projectId]/sessions/route.test.ts` | 154 | Direct DB insert | Use POST /api/projects |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts` | 44, 52, 340 | Direct DB operations | Use interrupt API |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts` | 46, 54 | Direct DB operations | Use updates API |

**Medium Priority (Share & Auth Tests):**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/share/[token]/route.test.ts` | 40, 48 | Direct DB insert | Use share creation API |
| `apps/web/app/api/share/route.test.ts` | 194 | Direct DB insert | Use share API |
| `apps/web/app/api/shares/route.test.ts` | 171, 180, 287 | Direct DB operations | Use shares API |
| `apps/web/app/api/shares/[id]/route.test.ts` | 78, 129, 137, 235 | Direct DB operations | Use share management API |

**CLI Token Tests:**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/cli/auth/tokens-list.test.ts` | 19, 107, 116 | Direct DB operations | Use token API |
| `apps/web/app/api/cli/auth/generate-token/route.test.ts` | 23, 152, 200, 211, 312 | Direct DB operations | Use token generation API |
| `apps/web/app/api/github/setup/route.test.ts` | Multiple | Direct DB operations | Use GitHub setup API |

**Other Tests:**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/projects/[projectId]/blob-token/route.test.ts` | 87 | Direct DB insert | Use project creation API |
**Example:**
```typescript
// ❌ Current approach - manual database operations
beforeEach(async () => {
  await db.insert(PROJECTS_TBL).values({ 
    id: projectId, 
    userId, 
    name: "Test Project" 
  });
  await db.insert(SESSIONS_TBL).values({ 
    id: sessionId, 
    projectId 
  });
});

// ✅ Better approach - reuse API endpoints
beforeEach(async () => {
  const projectRes = await POST("/api/projects", { 
    json: { name: "Test Project" } 
  });
  const { id: projectId } = await projectRes.json();
  
  const sessionRes = await POST(`/api/projects/${projectId}/sessions`, {
    json: { title: "Test Session" }
  });
  const { id: sessionId } = await sessionRes.json();
});
```
**Benefits:**
- Tests use the same code paths as production
- Business logic changes are automatically reflected in tests
- Reduces test maintenance overhead
- Better coverage of actual API workflows


## Implementation Plan

### Phase 1: Critical Path ✅ **COMPLETED**
- [x] Fix database test isolation (HIGH PRIORITY) - **DONE** (PR #261)
- [x] Fix production code `any` types (2 violations) - **DONE** 
- [ ] Add vi.clearAllMocks() to remaining 17 test files

### Phase 2: API Tests 🟡 **IN PROGRESS**
- [x] Remove unnecessary try-catch blocks in GitHub integration - **DONE**
- [x] Fix remaining hardcoded URL in device auth - **DONE** (PR #259)
- [ ] Refactor remaining 12 test files using direct DB operations

### Phase 3: Prevention and Documentation
- [ ] Add ESLint rule for `@typescript-eslint/no-explicit-any`
- [ ] Add lint rule to prevent direct DB access in tests
- [ ] Document test best practices and isolation strategies

## Metrics

### Current State (October 2025)
- Direct DB operations: **12 files** (down from 18+)
- Test mock cleanup missing: **0 files** ✅ RESOLVED
- TypeScript `any` violations: **3 test files** (down from 5, production code clean)
- Try-catch violations: **0** ✅ RESOLVED
- Timer cleanup issues: **0** ✅ RESOLVED
- Hardcoded URLs: **0** ✅ RESOLVED
- Database test isolation: **Unique IDs implemented** ✅ RESOLVED
- MSW unhandled requests: **Needs investigation** 🔴 ACTIVE
- Flaky E2E tests: **Temporarily mitigated with retries** 🟡 NEEDS PROPER FIX

### Target State
- Direct DB operations: **0 files**
- Test mock cleanup: **100% coverage**
- TypeScript `any` violations: **0**
- MSW unhandled requests: **0 warnings** (all handlers properly configured)
- ~~Try-catch violations: **0 unnecessary blocks**~~ ✅ ACHIEVED
- ~~Hardcoded URLs: **0**~~ ✅ ACHIEVED
- ~~Database test isolation: **Transaction-based with rollback**~~ ✅ ACHIEVED (via unique IDs)

## Prevention Strategy

1. **ESLint Rules**
   ```javascript
   // Prevent direct DB imports in test files
   {
     "rules": {
       "no-restricted-imports": {
         "patterns": ["*/db", "*/database"],
         "message": "Use API handlers instead of direct database access in tests"
       }
     }
   }
   ```

2. **Code Review Checklist**
   - [ ] No direct database operations in tests
   - [ ] No artificial delays or setTimeout
   - [ ] Tests use API endpoints for setup
   - [ ] Tests are deterministic and repeatable
   - [ ] MSW-based tests have zero unhandled request warnings
   - [ ] MSW handlers use wildcard or full URL patterns

3. **CI/CD Checks**
   - Add automated check for forbidden patterns
   - Fail builds that introduce new technical debt

## Recent Improvements Summary (October 2025)

### Major Achievements:
1. **Database Test Isolation** ✅ - Implemented unique user IDs to prevent race conditions (PR #261)
2. **Production Code Type Safety** ✅ - Removed all `any` types from production code
3. **Hardcoded URLs** ✅ - All URLs now use centralized configuration (PR #259)
4. **Try-Catch Cleanup** ✅ - Removed unnecessary defensive programming patterns
5. **Test Mock Cleanup** ✅ - Added `vi.clearAllMocks()` to all 17 test files (PR #272)
6. **MSW Integration** 🟡 - Started migrating from fetch mocking to MSW (October 2025)

### Remaining Work:
- **Flaky E2E Tests** 🟡 - Remove retry band-aid and implement proper deployment readiness checks
- **MSW Unhandled Requests** 🔴 - Need to fix handler patterns to eliminate warnings
- **Test Code `any` Types** - 3 violations in test files (low priority)
- **Direct DB Operations in Tests** - 12 files need refactoring to use API endpoints

### Impact:
The most critical technical debt items have been resolved, significantly improving:
- Test reliability and parallelization
- Type safety in production code
- Configuration management
- Code maintainability

---

*Last updated: 2025-10-21*