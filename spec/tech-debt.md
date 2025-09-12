# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

> **Goal**: Achieve zero direct database operations in tests, proper test isolation, and strict type safety

## Test Mock Cleanup Issues
**Issue:** Tests don't explicitly call `vi.clearAllMocks()` in beforeEach hooks, which could lead to mock state leakage between tests.
**Source:** Code review commit 3d3a1ff
**Status:** 🟡 Partially Fixed (42% coverage - 11/26 files fixed)
**Solution:** Add proper mock cleanup in all test files:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Files Still Missing Mock Cleanup (17 files):**
- `/turbo/apps/web/app/api/cli/auth/generate-token/route.test.ts`
- `/turbo/apps/web/app/api/cli/auth/tokens-list.test.ts`
- `/turbo/apps/web/app/api/github/setup/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/blob-token/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/api.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/route.api.test.ts`
- `/turbo/apps/web/app/api/projects/[projectId]/sessions/route.test.ts`
- `/turbo/apps/web/app/api/projects/route.test.ts`
- `/turbo/apps/web/app/api/share/route.test.ts`
- `/turbo/apps/web/app/api/shares/[id]/route.test.ts`
- `/turbo/apps/web/app/api/shares/route.test.ts`

**Risk:** Mock state could leak between tests causing flaky test behavior.

## Database Test Isolation Strategy
**Issue:** Tests share database state without proper isolation, which could cause race conditions and flaky tests when run in parallel.
**Source:** Code review commit 3d3a1ff
**Status:** 🔴 Critical - Not Started
**Severity:** HIGH - Tests run in parallel without protection, using shared user IDs
**Solutions:**
1. **Different Users/Projects per Test:** Create unique test data IDs for each test
2. **Transaction Rollback:** Wrap tests in transactions that rollback after completion
3. **Parallel Execution Guards:** Disable parallel execution for database tests if needed

**Example Implementation:**
```typescript
// Option 1: Unique test data
const testUserId = `test-user-${Date.now()}-${Math.random()}`;

// Option 2: Transaction rollback
await db.transaction(async (tx) => {
  // Test operations
  await tx.rollback();
});
```

## TypeScript `any` Type Cleanup
**Issue:** Several files still contain `any` types which compromise type safety and violate project standards.
**Source:** Code review September 11-12, 2025
**Status:** 🔴 Not Started (5 violations found)
**Problem:** 
- Project has zero tolerance for `any` types per design principles
- `any` types disable TypeScript's type checking
- Makes refactoring risky and error-prone
- Reduces IDE autocomplete and IntelliSense effectiveness

**Specific Violations:**

**Production Code (HIGH PRIORITY - 2 violations):**
1. `/turbo/apps/web/app/projects/page.tsx`
   - Line 43: `projectsContract.listProjects as any,`
   - Line 67: `projectsContract.createProject as any,`

**Test Code (3 violations):**
2. `/turbo/apps/workspace/custom-eslint/__tests__/rules.test.ts`
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
**Status:** 🟡 Partially Present (3-4 violations in GitHub integration)
**Severity:** MEDIUM
**Problem:** 
- Non-UI code (especially server-side) should follow fail-fast principle
- Catching exceptions unnecessarily can hide real problems
- Makes debugging harder by swallowing stack traces

**Guidelines:**
- ✅ **Use try-catch for:** UI components for user feedback, external API calls with fallbacks
- ❌ **Avoid try-catch for:** Internal function calls, database operations (unless specific recovery needed), configuration loading

**Files with Violations:**
1. `/turbo/apps/web/app/api/github/installations/route.ts` - Generic error handling without value
2. `/turbo/apps/web/app/api/github/webhook/route.ts` - Wraps entire webhook processing unnecessarily
3. `/turbo/apps/web/app/api/projects/[projectId]/blob-token/route.ts` - Defensive catch for token generation

**Note:** `/turbo/apps/web/app/api/github/setup/route.ts` has legitimate fallback behavior and should keep its try-catch

## Hardcoded URL Configuration
**Issue:** Hardcoded URLs in API routes instead of using centralized configuration.
**Source:** Code review commit d50b99c
**Status:** 🟢 Mostly Fixed (1 file remaining)

**Remaining Issue:**
- `/turbo/apps/web/app/api/cli/auth/device/route.ts` (Line 62): Hardcoded `"https://uspark.ai/cli-auth"`

**Solution:** 
Update the remaining file to use `env().APP_URL`:
```typescript
import { env } from "../../../../../src/env";
// ...
verification_url: `${env().APP_URL}/cli-auth`,
```

**Note:** The original issue in `/api/shares/route.ts` has been fixed and now correctly uses `env().APP_URL`.

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

### Phase 1: Critical Path
- [ ] Fix database test isolation (HIGH PRIORITY)
- [ ] Fix production code `any` types (2 violations)
- [ ] Add vi.clearAllMocks() to remaining 17 test files

### Phase 2: API Tests
- [ ] Remove unnecessary try-catch blocks in GitHub integration
- [ ] Fix remaining hardcoded URL in device auth
- [ ] Refactor remaining 12 test files using direct DB operations

### Phase 3: Prevention and Documentation
- [ ] Add ESLint rule for `@typescript-eslint/no-explicit-any`
- [ ] Add lint rule to prevent direct DB access in tests
- [ ] Document test best practices and isolation strategies

## Metrics

### Current State (December 2024)
- Direct DB operations: **12 files** (down from 18+)
- Test mock cleanup missing: **17 files** (58% of files with mocks)
- TypeScript `any` violations: **5 total** (2 production, 3 test)
- Try-catch violations: **3-4 files** (GitHub integration)
- Hardcoded URLs: **1 file** (down from multiple)
- Database test isolation: **No transaction isolation** (CRITICAL)

### Target State
- Direct DB operations: **0 files**
- Test mock cleanup: **100% coverage**
- TypeScript `any` violations: **0**
- Try-catch violations: **0 unnecessary blocks**
- Hardcoded URLs: **0**
- Database test isolation: **Transaction-based with rollback**

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

3. **CI/CD Checks**
   - Add automated check for forbidden patterns
   - Fail builds that introduce new technical debt

---

*Last updated: 2024-12-12*