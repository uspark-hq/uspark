# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

> **Goal**: Achieve zero direct database operations and artificial delays in tests

## Test Mock Cleanup Issues
**Issue:** Tests don't explicitly call `vi.clearAllMocks()` in beforeEach hooks, which could lead to mock state leakage between tests.
**Source:** Code review commit 3d3a1ff
**Status:** 🔴 Not Started
**Solution:** Add proper mock cleanup in all test files:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```
**Risk:** Mock state could leak between tests causing flaky test behavior.

## Database Test Isolation Strategy
**Issue:** Tests share database state without proper isolation, which could cause race conditions and flaky tests when run in parallel.
**Source:** Code review commit 3d3a1ff
**Status:** 🔴 Not Started
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

## Overuse of Try-Catch Blocks (Fail-Fast Principle Violation)
**Issue:** Excessive use of try-catch blocks in non-UI code where errors should fail fast rather than being caught.
**Status:** 🔴 Not Started
**Problem:** 
- Non-UI code (especially server-side) should follow fail-fast principle
- Catching exceptions unnecessarily can hide real problems
- Makes debugging harder by swallowing stack traces

**Guidelines:**
- ✅ **Use try-catch for:** UI components for user feedback, external API calls with fallbacks
- ❌ **Avoid try-catch for:** Internal function calls, database operations (unless specific recovery needed), configuration loading

**Review needed in:**
- API route handlers (except for known external service failures)
- Database utility functions
- Internal service calls

## Hardcoded URL Configuration
**Issue:** Using `process.env.NEXT_PUBLIC_APP_URL || "https://uspark.ai"` in API routes instead of centralized configuration.
**Source:** Code review commit d50b99c
**Status:** 🔴 Not Started
**Current usage:** `/api/shares/route.ts` uses hardcoded fallback URL
**Problems:**
1. NEXT_PUBLIC_APP_URL is intended for client-side usage, but being used in server-side API route
2. Hardcoded fallback URL is not environment-aware
3. No centralized URL configuration management

**Solution:** 
1. **Add APP_URL to server environment variables** in `src/env.ts`:
   ```typescript
   server: {
     APP_URL: z.string().url().default("http://localhost:3000"),
     // ... other server vars
   }
   ```
2. **Update API route** to use `env().APP_URL` instead of `process.env.NEXT_PUBLIC_APP_URL`
3. **Set proper APP_URL** in production environment (different from NEXT_PUBLIC_APP_URL)

**Investigation needed:** Understand why NEXT_PUBLIC_APP_URL was chosen for server-side usage and determine correct server-side URL configuration strategy.

## Test Database Setup Refactoring
**Issue:** Tests in route.test.ts files heavily rely on manual database operations for setup, which duplicates logic already implemented in API endpoints.
**Problem:** 
- Manual database operations in tests duplicate business logic from API endpoints
- Makes tests brittle when database schema or business logic changes
- Increases maintenance burden when API logic changes
**Solution:** Refactor tests to reuse existing API endpoints for data setup instead of direct database manipulation.
**Status:** 🟡 In Progress (2025-09-08)
**Progress:** Initial refactoring done in commit 2ffa295, but 18+ files still need fixing

### Detailed Analysis (September 8, 2025)

#### Files Still Using Direct Database Operations (18+ files)

**High Priority (Core API Tests):**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/projects/route.test.ts` | 116 | Direct DB insert | Create test helper using API |
| `apps/web/app/api/projects/[projectId]/sessions/route.test.ts` | 154 | Direct DB insert | Use POST /api/projects |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts` | 172 | Direct DB operations | Use session API endpoints |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts` | Multiple | Direct DB operations | Use turns API endpoints |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts` | 46, 54 | Direct DB operations | Use updates API |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts` | 44, 52, 340 | Direct DB operations | Use interrupt API |

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
| `apps/web/app/api/cli/auth/device/route.test.ts` | Multiple | Direct DB operations | Use device auth API |
| `apps/web/app/api/cli/auth/token/route.test.ts` | Multiple | Direct DB operations | Use token validation API |

**Other Tests:**
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/src/lib/sessions/blocks.test.ts` | 186, 194, 201 | Direct DB insert | Create proper test fixtures |
| `apps/web/app/api/projects/[projectId]/blob-token/route.test.ts` | 87 | Direct DB insert | Use project creation API |
| `apps/web/app/api/projects/[projectId]/route.test.ts` | Multiple | Direct DB operations | Use project API |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts` | Multiple | Direct DB operations | Use turn API |
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

## Artificial Delays in Tests
**Issue:** Multiple test files contain artificial delays using `setTimeout` with `Promise`, indicating timing-dependent test logic
**Source:** Code review analysis (2025-09-08)
**Status:** 🔴 Not Started
**Problem:** 
- Tests may fail randomly based on system load
- Accumulated delays slow down CI/CD pipeline
- Masks actual race conditions in production code
- Tests may pass locally but fail in CI

### Files with Artificial Delays (7 files)

| File | Line | Delay | Reason | Solution |
|------|------|-------|--------|----------|
| `sessions/route.test.ts` | 272, 310 | 10ms | "Ensure different timestamps" | Use mock timers or sequence IDs |
| `turns/[turnId]/route.test.ts` | 458 | 10ms | Timestamp differentiation | Use deterministic ordering |
| `turns/route.test.ts` | 354, 395, 406 | 10-20ms | Order dependency | Use proper event sequencing |
| `sessions/[sessionId]/route.test.ts` | 172 | 10ms | Timing issue | Fix underlying race condition |
| `interrupt/route.test.ts` | 247 | 10ms | State synchronization | Use proper async/await |
| `updates/route.test.ts` | 168, 180 | 10ms | Update ordering | Use transaction or batch updates |

### Why This Is Critical

**Artificial delays are problematic because:**
1. **Test Flakiness**: Random failures based on system load
2. **Slow Test Suite**: Accumulated delays slow down CI/CD
3. **Hidden Bugs**: Masks actual race conditions
4. **False Positives**: Pass locally, fail in CI

### Refactoring Strategy

1. **Use Mock Timers:**
```typescript
// Instead of:
await new Promise((resolve) => setTimeout(resolve, 10));

// Use:
vi.useFakeTimers();
vi.advanceTimersByTime(10);
```

2. **Use Deterministic IDs:**
```typescript
// Instead of relying on timestamp differences:
const turn1 = { id: generateId(), sequence: 1 };
const turn2 = { id: generateId(), sequence: 2 };
```

3. **Wait for Specific Conditions:**
```typescript
// Instead of arbitrary delay:
await waitFor(() => {
  expect(getSessionState()).toBe('ready');
});
```

## Implementation Plan

### Phase 1: Critical Path (Week 1)
- [ ] Refactor project and session tests
- [ ] Remove all artificial delays
- [ ] Create basic test helpers

### Phase 2: API Tests (Week 2)
- [ ] Refactor share API tests
- [ ] Refactor CLI auth tests
- [ ] Implement test factories

### Phase 3: Complete Migration (Week 3)
- [ ] Refactor remaining tests
- [ ] Add lint rule to prevent direct DB access
- [ ] Document test best practices

## Metrics

### Current State (September 8, 2025)
- Direct DB operations: **18+ files**
- Artificial delays: **7 files**
- Test execution time: **[Measure baseline]**
- Test flakiness rate: **[Measure baseline]**

### Target State
- Direct DB operations: **0 files**
- Artificial delays: **0 files**
- Test execution time: **-30% reduction**
- Test flakiness rate: **0%**

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

*Last updated: 2025-09-08*