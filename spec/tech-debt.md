# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

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
**Issue:** Using `process.env.NEXT_PUBLIC_APP_URL || "https://uspark.dev"` in API routes instead of centralized configuration.
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
**Status:** 🔴 Not Started
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

---

*Last updated: 2025-09-06*
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
**Issue:** Using `process.env.NEXT_PUBLIC_APP_URL || "https://uspark.dev"` in API routes instead of centralized configuration.
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
**Status:** 🔴 Not Started
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

---

*Last updated: 2025-09-06*