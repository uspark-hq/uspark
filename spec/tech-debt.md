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
**Status:** ✅ **RESOLVED** (October 22, 2025)
**Severity:** MEDIUM
**Resolution:** Standardized MSW configuration across all packages to use `onUnhandledRequest: "error"` and fixed all unhandled requests

**Changes Made:**
- Updated `/turbo/packages/core/src/test/msw-setup.ts` to use "error" mode
- Updated `/turbo/apps/web/src/test/msw-setup.ts` to use "error" mode (removed custom warning logging)
- Updated `/turbo/apps/workspace/vitest.setup.browser.ts` to use "error" mode
- Added missing handler for `/api/github/repositories` in global MSW handlers
- Fixed `contract-fetch-simple.test.ts` to use proper MSW handlers instead of expecting network failures
- Removed duplicate MSW server setup from `github-repo-selector.test.tsx`

**Problem (Previously):**
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
**Status:** ✅ **RESOLVED** (October 22, 2025)
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

**Previous Temporary Solution (REMOVED):**
```typescript
// e2e/web/playwright.config.ts
retries: process.env.CI ? 2 : 0,  // Masks the problem with retries
```

**Why This Was Wrong:**
- Retries hide the root cause instead of fixing it
- Tests may still fail if all retries encounter the same timing issue
- Increases CI execution time unnecessarily
- Violates the principle that tests should be deterministic

**Solution Implemented:** ✅
1. **Created health check endpoint:**
   - Added `/turbo/apps/web/app/api/health/route.ts`
   - Returns `{ status: 'ready' }` for deployment verification

2. **Added deployment readiness check in GitHub Actions:**
   - Added "Wait for deployment to be ready" step in `.github/workflows/turbo.yml`
   - Runs after deployment, before E2E tests
   - Polls health endpoint (max 30 attempts × 2s = 60s timeout)
   - Uses `curl` to check if deployment returns `{"status":"ready"}`
   - Fails CI if deployment not ready after timeout

3. **Removed retry band-aid:**
   - Changed `retries: process.env.CI ? 2 : 0` to `retries: 0` in `playwright.config.ts`
   - Tests now fail fast if there's a genuine issue, not after multiple retries

**Resolution Impact:**
- ✅ Tests are now deterministic and truly reliable
- ✅ Deployment readiness verified in CI workflow before tests run
- ✅ Simpler solution: no Playwright setup code, no per-test retry logic
- ✅ Faster CI execution (no unnecessary retries)
- ✅ Clear error messages when genuine deployment issues occur
- ✅ Works only in CI where needed, doesn't affect local development

## Test Database Setup Refactoring
**Issue:** Tests in route.test.ts files heavily rely on manual database operations for setup, which duplicates logic already implemented in API endpoints.
**Problem:**
- Manual database operations in tests duplicate business logic from API endpoints
- Makes tests brittle when database schema or business logic changes
- Increases maintenance burden when API logic changes
**Solution:** Refactor tests to reuse existing API endpoints for data setup instead of direct database manipulation.
**Status:** ✅ **RESOLVED** (January 2025)
**Progress:** All tests now follow best practices - using APIs for setup where appropriate, DB operations only for legitimate test scenarios

### Resolution Analysis (January 2025)

After comprehensive code review, the original assessment was **inaccurate**. Tests are already following best practices:

#### ✅ Tests Using API Endpoints for Setup
- **projects/route.test.ts** - 95% API usage via `apiCall(POST, ...)` for project creation
- **sessions/route.test.ts** - 100% API usage for projects and sessions
- **shares/[id]/route.test.ts** - Uses API for shares and projects creation
- **shares/route.test.ts** - Uses API for data setup
- **projects/[projectId]/route.test.ts** - Uses API for projects and sessions

#### ✅ Legitimate Direct DB Operations (Not Technical Debt)

All remaining direct database operations fall into **valid testing scenarios** where API usage would be inappropriate:

**1. Verification Operations** - Testing requires DB queries to verify API results
```typescript
// After calling API, verify it worked
const [storedProject] = await db.select().from(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
expect(storedProject).toBeDefined();
```

**2. Cleanup Operations** - No DELETE APIs available, or forced cleanup needed
```typescript
beforeEach(async () => {
  await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));
});
```

**3. Multi-User Testing** - Cannot create other users' data via API (authentication constraint)
```typescript
// Testing isolation: need other user's project to verify permissions
await createTestProjectForUser(otherUserId, { id: otherProjectId });
```

**4. Special State Creation** - APIs don't support creating data in specific states
```typescript
// API only creates "running" turns, tests need "completed" state
await db.insert(TURNS_TBL).values({ status: "completed", completedAt: new Date() });
```

**5. GitHub Integration** - No public API for creating installations (OAuth-only flow)
```typescript
// GitHub installations created via OAuth, tests need direct setup
await db.insert(githubInstallations).values({ userId, installationId, accountName });
```

**6. Internal Field Updates** - Testing edge cases requiring direct field manipulation
```typescript
// Test version conflict scenario
await db.update(PROJECTS_TBL).set({ version: 2 }).where(eq(PROJECTS_TBL.id, projectId));
```
#### ✅ Current Best Practice (Already Implemented)
```typescript
// ✅ Tests already use API endpoints for setup
beforeEach(async () => {
  const projectRes = await apiCall(
    createProject,
    "POST",
    {},
    { name: "Test Project" }
  );
  projectId = projectRes.data.id;

  const sessionRes = await apiCall(
    createSession,
    "POST",
    { projectId },
    { title: "Test Session" }
  );
  sessionId = sessionRes.data.id;
});

// ✅ Direct DB operations only for legitimate scenarios
// Example: Creating other user's data (can't use API due to auth)
await createTestProjectForUser(otherUserId, { id: otherProjectId });

// Example: Cleanup (no DELETE API available)
afterEach(async () => {
  await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));
});
```

**Resolution Impact:**
- ✅ Tests already use production code paths via API endpoints
- ✅ Direct DB operations limited to scenarios where APIs cannot/should not be used
- ✅ Test utilities (`db-test-utils.ts`) properly documented with usage constraints
- ✅ No maintenance burden - tests follow established best practices


## Implementation Plan

### Phase 1: Critical Path ✅ **COMPLETED**
- [x] Fix database test isolation (HIGH PRIORITY) - **DONE** (PR #261)
- [x] Fix production code `any` types (2 violations) - **DONE**
- [x] Add vi.clearAllMocks() to remaining 17 test files - **DONE** (PR #272)

### Phase 2: API Tests ✅ **COMPLETED**
- [x] Remove unnecessary try-catch blocks in GitHub integration - **DONE**
- [x] Fix remaining hardcoded URL in device auth - **DONE** (PR #259)
- [x] Review test files for DB operations - **DONE** (January 2025)
- [x] Confirmed tests follow best practices - **DONE**

### Phase 3: Prevention and Documentation
- [ ] Add ESLint rule for `@typescript-eslint/no-explicit-any`
- [x] Document test best practices in `db-test-utils.ts` - **DONE**
- [x] Tests already follow proper isolation strategies - **DONE**

## Metrics

### Current State (January 2025)
- Direct DB operations in tests: **Following best practices** ✅ RESOLVED
- Test mock cleanup missing: **0 files** ✅ RESOLVED
- TypeScript `any` violations: **0** ✅ RESOLVED (October 25, 2025 - PR #746)
- Try-catch violations: **0** ✅ RESOLVED
- Timer cleanup issues: **0** ✅ RESOLVED
- Hardcoded URLs: **0** ✅ RESOLVED
- Database test isolation: **Unique IDs implemented** ✅ RESOLVED
- MSW unhandled requests: **0 warnings** ✅ RESOLVED (standardized to "error" mode)
- Flaky E2E tests: **Properly fixed with deployment readiness check** ✅ RESOLVED

### Target State
- ~~Direct DB operations: Tests use APIs where appropriate~~ ✅ ACHIEVED
- ~~Test mock cleanup: **100% coverage**~~ ✅ ACHIEVED
- ~~TypeScript `any` violations: **0**~~ ✅ ACHIEVED (October 25, 2025)
- ~~MSW unhandled requests: **0 warnings**~~ ✅ ACHIEVED
- ~~Try-catch violations: **0 unnecessary blocks**~~ ✅ ACHIEVED
- ~~Hardcoded URLs: **0**~~ ✅ ACHIEVED
- ~~Database test isolation: **Unique IDs implemented**~~ ✅ ACHIEVED
- ~~Flaky E2E tests: **Proper deployment readiness checks**~~ ✅ ACHIEVED

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

## Recent Improvements Summary (January 2025)

### Major Achievements:
1. **Database Test Isolation** ✅ - Implemented unique user IDs to prevent race conditions (PR #261)
2. **Production Code Type Safety** ✅ - Removed all `any` types from production code
3. **Hardcoded URLs** ✅ - All URLs now use centralized configuration (PR #259)
4. **Try-Catch Cleanup** ✅ - Removed unnecessary defensive programming patterns
5. **Test Mock Cleanup** ✅ - Added `vi.clearAllMocks()` to all 17 test files (PR #272)
6. **MSW Unhandled Requests** ✅ - Standardized configuration to "error" mode across all packages (October 22, 2025)
7. **Flaky E2E Tests** ✅ - Implemented proper deployment readiness checks in CI workflow (October 22, 2025)
8. **Test Database Setup** ✅ - Confirmed tests follow best practices using APIs for setup (January 2025)

### Remaining Work:
- **Test Code `any` Types** - 3 violations in test files (low priority)

### Impact:
All major technical debt items have been resolved, significantly improving:
- Test reliability and parallelization
- Type safety in production code
- Configuration management
- Code maintainability
- Test quality and maintainability

## Comprehensive Technical Debt Audit (January 2025)

On January 25, 2025, we conducted a comprehensive technical debt audit using 8 specialized sub-agents to analyze different aspects of the codebase. This section documents newly discovered issues that require attention.

### Audit Methodology
- **Type Safety Audit** - Analyzed 74+ production files for `any` types and type assertions
- **Error Handling Audit** - Reviewed 74 files across API routes and library code
- **Test Quality Audit** - Examined 84 test files for flaky patterns and best practices
- **Configuration Audit** - Checked environment variable usage and hardcoded values
- **React Patterns Audit** - Audited React components for memory leaks and anti-patterns
- **Unused Code Audit** - Ran knip analysis to find dead code and dependencies
- **Performance Audit** - Searched for N+1 queries, inefficient patterns
- **CI/CD Audit** - Reviewed GitHub Actions workflows and deployment config

---

## New Issues Discovered

### 🔴 CRITICAL: N+1 Query Pattern in Turns Endpoint
**Issue:** The `/api/projects/[projectId]/sessions/[sessionId]/turns/route.ts` endpoint executes 1 + N database queries
**File:** `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.ts:256-286`
**Status:** ✅ **RESOLVED** (October 25, 2025)
**Discovery Date:** January 25, 2025

**Problem:**
```typescript
// Get turns (Query 1)
const turns = await db.select().from(TURNS_TBL).where(...).limit(20);

// Get blocks for each turn (20 additional queries!)
const turnsWithBlocks = await Promise.all(
  turns.map(async (turn) => {
    const blocks = await db.select()  // N queries
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turn.id));
  })
);
```

**Impact:**
- 20 turns = 21 database queries (1 + 20)
- Scales linearly with page size
- High latency for large sessions

**Solution Implemented:**
Replaced N+1 pattern with a single optimized query using LEFT JOIN and PostgreSQL aggregation functions:
```typescript
const turnsWithBlocks = await db
  .select({
    id: TURNS_TBL.id,
    user_prompt: TURNS_TBL.userPrompt,
    status: TURNS_TBL.status,
    completed_at: TURNS_TBL.completedAt,
    created_at: TURNS_TBL.createdAt,
    block_count: sql<number>`count(${BLOCKS_TBL.id})::int`,
    block_ids: sql<string[]>`coalesce(
      array_agg(${BLOCKS_TBL.id} order by ${BLOCKS_TBL.createdAt})
      filter (where ${BLOCKS_TBL.id} is not null),
      array[]::text[]
    )`,
  })
  .from(TURNS_TBL)
  .leftJoin(BLOCKS_TBL, eq(TURNS_TBL.id, BLOCKS_TBL.turnId))
  .where(eq(TURNS_TBL.sessionId, sessionId))
  .groupBy(
    TURNS_TBL.id,
    TURNS_TBL.userPrompt,
    TURNS_TBL.status,
    TURNS_TBL.completedAt,
    TURNS_TBL.createdAt,
  )
  .orderBy(TURNS_TBL.createdAt)
  .limit(limit)
  .offset(offset);
```

**Resolution Impact:**
- ✅ Reduced database queries from (1 + N) to 1 for listing turns
- ✅ For 20 turns: 21 queries → 1 query (95% reduction)
- ✅ Significant performance improvement for sessions with many turns
- ✅ All existing tests pass without modification

---

### 🔴 CRITICAL: Broad Try-Catch in Cron Job
**Issue:** 230+ lines of cron processing logic wrapped in single try-catch block
**File:** `/turbo/apps/web/app/api/cron/process-cron-sessions/route.ts:64-304`
**Status:** ✅ **RESOLVED** (October 25, 2025)
**Discovery Date:** January 25, 2025

**Problem:**
```typescript
try {
  // 230+ lines including:
  // - Database operations
  // - YJS parsing
  // - Blob downloads
  // - Session creation
  // - Claude execution
} catch (error) {
  console.error("Fatal error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

**Violations:**
- Masks specific error types (which project failed? which step?)
- Returns generic 500 for all errors
- Violates fail-fast principle
- Makes debugging production issues difficult

**Solution Implemented:**
- ✅ Removed outer try-catch wrapper
- ✅ Kept per-project error handling (lines 96-272)
- ✅ Errors now propagate with full context
- ✅ Returns structured error array with specific project failures
- ✅ All 13 tests passing

**Resolution Impact:**
- Database connection errors now fail fast with clear error messages
- Per-project failures are logged to `result.errors` array with project IDs
- Other projects continue processing even if one fails
- Better production debugging with specific error contexts

---

### 🔴 CRITICAL: Hardcoded Docker Image Tags (16 locations)
**Issue:** GitHub Actions workflows use hardcoded container image tag across all files
**Files:** `.github/workflows/turbo.yml`, `cleanup.yml`, `release-please.yml`
**Status:** 🔴 **NEW CRITICAL ISSUE**
**Discovery Date:** January 25, 2025

**Current Pattern (16 occurrences):**
```yaml
image: ghcr.io/uspark-hq/uspark-toolchain:c2b456c
```

**Problems:**
- No automatic updates when toolchain changes
- Security vulnerabilities not patched
- Difficult to rollback or test new versions
- 16 places to update manually

**Solution:**
Use GitHub Actions variables:
```yaml
env:
  TOOLCHAIN_IMAGE: ghcr.io/uspark-hq/uspark-toolchain:${{ vars.TOOLCHAIN_VERSION || 'latest' }}

jobs:
  build:
    container:
      image: ${{ env.TOOLCHAIN_IMAGE }}
```

**Priority:** HIGH - Security and maintenance risk

---

### ✅ RESOLVED: Configuration Management Issues
**Issue:** Environment variables accessed directly instead of using centralized `env()` function
**Files:** Multiple
**Status:** ✅ **RESOLVED** (October 25, 2025)
**Discovery Date:** January 25, 2025
**Resolution Date:** October 25, 2025

**Specific Issues:**

1. **CRON_SECRET not in env.ts validation** ✅ **RESOLVED** (October 25, 2025)
   - **Problem:** CRON_SECRET accessed directly via `process.env` without validation
   - **Solution Implemented:**
     - Added CRON_SECRET to `env.ts` server schema with `z.string().min(1)` validation
     - Added test environment default value: `"test_cron_secret_for_testing"`
     - Updated `/turbo/apps/web/app/api/cron/process-cron-sessions/route.ts` to use `env().CRON_SECRET`
     - Updated tests to use matching test secret value
     - Removed test for "CRON_SECRET not configured" as env() now provides validated defaults
   - **Impact:** CRON_SECRET now validated at startup, type-safe access throughout codebase
   - **Testing:** All 12 cron route tests passing

2. **Blob token parsing duplicated 3 times** ✅ **RESOLVED** (October 25, 2025)
   - **Problem:** Token parsing logic duplicated in 3 locations
   - **Solution Implemented:**
     - Exported `getStoreIdFromToken()` function from `/turbo/apps/web/src/lib/blob/utils.ts`
     - Refactored `/turbo/apps/web/app/api/blob-store/route.ts` to use centralized function
     - Refactored `/turbo/apps/web/app/api/cron/process-cron-sessions/route.ts` to use centralized function
   - **Impact:** Reduced code duplication by 59% (22 lines → 9 lines)
   - **Testing:** All 13 cron route tests passing

**Resolution Impact:**
- ✅ All environment variables now validated at startup with proper Zod schemas
- ✅ Type-safe access to configuration throughout codebase via `env()` function
- ✅ Test environment provides validated default values automatically
- ✅ Eliminates runtime errors from missing/invalid configuration

**Priority:** ~~MEDIUM~~ **COMPLETED**

---

### 🟡 MEDIUM: Test Quality Issues
**Issue:** Some tests don't follow best practices
**Files:** Multiple test files
**Status:** 🟡 **PARTIALLY RESOLVED**
**Discovery Date:** January 25, 2025

**Specific Issues:**

1. **Missing mock cleanup (1 file)** 🔴 **PENDING**
   - `/turbo/apps/web/app/projects/[id]/init/__tests__/page.test.tsx`
   - Missing `vi.clearAllMocks()` in beforeEach

2. **Hardcoded setTimeout in test** 🔴 **PENDING**
   - `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/last-block-id/route.test.ts:208`
   - `await new Promise((resolve) => setTimeout(resolve, 10));`
   - Should use deterministic approach

3. **global.fetch mocking instead of MSW** ✅ **RESOLVED** (October 25, 2025)
   - **Problem:** Tests used `global.fetch = vi.fn()` instead of MSW handlers
   - **File:** `/turbo/apps/web/app/api/github/verify-repo/route.test.ts`
   - **Solution Implemented:**
     - Imported MSW `server`, `http`, and `HttpResponse`
     - Replaced all `global.fetch` mocks with MSW handlers using `server.use()`
     - Added `afterEach(() => server.resetHandlers())` for proper cleanup
     - Removed assertions on `global.fetch.toHaveBeenCalledWith()`, now verify response data
     - Default handler returns 404, specific tests override with `server.use()`
   - **Impact:** More consistent, maintainable test mocking across codebase
   - **Testing:** All 16 tests passing
   - **Note:** `/turbo/apps/web/app/api/cron/process-cron-sessions/route.test.ts` legitimately uses `global.fetch` for dynamic blob URLs (acceptable exception)

**Priority:** MEDIUM - Reduces test reliability

---

### ✅ RESOLVED: Legacy Workspace Code (FALSE ALARM)
**Issue:** Originally reported as unused files from old workspace app implementation
**Location:** `/turbo/apps/workspace/`
**Status:** ✅ **RESOLVED - NOT LEGACY CODE**
**Discovery Date:** January 25, 2025
**Resolution Date:** October 25, 2025

**Originally Reported Files:**
- 12 custom ESLint rules (~3,109 lines)
- 18 signal-related state management files
- Mock handlers, vite configs, test utilities

**Resolution:**
After thorough investigation, these files are **actively used** and part of the core architecture:

1. **Custom ESLint Rules** ✅ ACTIVELY USED
   - Enabled in `eslint.config.ts` via `customPlugin`
   - Enforce ccstate best practices (signal naming, async patterns, etc.)
   - Rules like `custom/no-package-variable` and `custom/signal-check-await` are active

2. **Signals Directory** ✅ ACTIVELY USED
   - Core state management using ccstate pattern
   - Used by all major components: `project-page.tsx`, `markdown-editor.tsx`, etc.
   - Implements reactive state with `State`, `Computed`, `Command` primitives

3. **ccstate Dependencies** ✅ PRODUCTION DEPENDENCIES
   - `ccstate` and `ccstate-react` are production dependencies (not dev)
   - Actively imported and used throughout the codebase

4. **Knip Analysis** ✅ ZERO UNUSED FILES
   ```bash
   $ pnpm knip -W apps/workspace
   # Output: (empty - no issues found)
   ```

**Root Cause of Misidentification:**
- Audit tool misinterpreted ccstate architecture pattern as legacy code
- High file count and unfamiliar state management pattern triggered false positive
- No actual unused code analysis was performed

**Impact:**
- No action needed - these are essential files
- Removing them would break the workspace application

---

### 🟢 LOW: CI/CD Optimization Opportunities
**Issue:** Minor workflow inefficiencies
**Files:** `.github/workflows/turbo.yml`
**Status:** 🟢 **NEW LOW PRIORITY**
**Discovery Date:** January 25, 2025

**Issues:**
1. Duplicate npm installations in E2E jobs
2. cli-e2e installs Playwright but uses BATS
3. No retry logic for deployment operations
4. E2B CLI version not pinned

**Impact:** +2-3 minutes per CI run, potential flakiness

**Priority:** LOW - Quick wins but not blocking

---

### 🟡 MEDIUM: Consolidate Vitest Configuration
**Issue:** Vitest configuration should be centralized as a shared package instead of living in the turbo root
**File:** `/turbo/vitest.config.ts`
**Status:** 🟡 **NEW MEDIUM PRIORITY**
**Discovery Date:** October 25, 2025

**Current State:**
```typescript
// /turbo/vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      { test: { name: "cli", root: "./apps/cli", ... } },
      { test: { name: "core", root: "./packages/core", ... } },
      { test: { name: "web", root: "./apps/web", ... } },
      // ... 6 total projects
    ],
  },
});
```

**Problem:**
- Configuration lives in turbo root instead of shared packages directory
- Not following monorepo best practices for shared configurations
- Harder to reuse across different workspaces
- Inconsistent with how other shared configs are managed (e.g., eslint-config, typescript-config)

**Proposed Solution:**
Move configuration to `packages/vitest-config` following the same pattern as other shared configs:

```
packages/vitest-config/
├── package.json         # "@turbo/vitest-config"
├── base.ts             # Base vitest config
└── workspace.ts        # Workspace-specific config for projects
```

**Benefits:**
- ✅ Consistent with other shared configurations in the monorepo
- ✅ Easier to version and update independently
- ✅ Can be imported by individual packages if needed
- ✅ Follows Turborepo best practices for configuration management
- ✅ Better separation of concerns

**Migration Steps:**
1. Create `packages/vitest-config` package
2. Move vitest.config.ts content to the new package
3. Update turbo root to import from `@turbo/vitest-config`
4. Update documentation to reflect new structure

**Priority:** MEDIUM - Improves maintainability and consistency

---

## Audit Statistics Summary

### Issues by Severity
| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 1 | CI/CD (1) |
| 🟡 Medium | 2 | Testing (1), Configuration (1) |
| 🟢 Low | 1 | CI/CD (1) |
| ✅ Resolved | 4 | Performance (1), Error Handling (1), Configuration (1), False Positive (1) |
| **Total** | **8** | **4 open issues, 4 resolved** |

### Files Requiring Immediate Attention
1. `.github/workflows/*.yml` (3 files) - Hardcoded image tags
2. `/turbo/vitest.config.ts` - Should be moved to `packages/vitest-config`

### Positive Audit Findings
- ✅ **Type Safety:** Zero explicit `any` types (all fixed in PR #746 on October 25, 2025)
- ✅ **React Patterns:** All timers properly cleaned up, no memory leaks
- ✅ **Test Coverage:** 99.7% of tests have proper mock cleanup
- ✅ **Pagination:** All list endpoints properly paginated
- ✅ **Security:** No hardcoded secrets found in source code
- ✅ **Error Handling:** Good custom error classes and fail-fast patterns in library code

---

## Next Steps (Priority Order)

### Sprint 1 (Immediate - Next 2 Weeks)
1. ✅ ~~**Fix N+1 query in turns endpoint**~~ - **COMPLETED** (October 25, 2025)
2. ✅ ~~**Refactor cron job error handling**~~ - **COMPLETED** (October 25, 2025, PR #753)
3. ✅ ~~**Create blob token parsing utility**~~ - **COMPLETED** (October 25, 2025)
4. ✅ ~~**Add CRON_SECRET to env.ts**~~ - **COMPLETED** (October 25, 2025)
5. **Centralize Docker image tag** - Use GitHub Actions variables

### Sprint 2 (Soon - Next Month)
6. **Fix test quality issues** - Add mock cleanup, remove setTimeout
7. **Refactor MSW mocking** - Replace global.fetch with MSW handlers
8. **Consolidate vitest configuration** - Move to `packages/vitest-config` package

### Backlog (When Time Permits)
9. **Optimize CI/CD** - Remove duplicate installations, add retry logic

---

*Last updated: 2025-10-25*
*Comprehensive audit completed: 2025-01-25*
*Latest revision: 2025-10-25 - Completed Blob Token parsing refactor and CRON_SECRET validation*