# Code Review: ea121b3 - test: add file content display test for project page

**Commit:** ea121b307e287546834812d0ac5cbfdbb9d5e361
**Author:** Ethan Zhang
**Date:** 2025-10-03

## Summary
Adds comprehensive test for file content display functionality using MSW mocks and YJS document creation.

## Code Quality Analysis

### ✅ Strengths
1. **Uses MSW for HTTP mocking** - Follows project guidelines (no fetch mocking)
2. **Real YJS document creation** - Tests actual data structures, not mocks
3. **Proper test cleanup** - Uses `server.resetHandlers()` in afterEach
4. **Good test structure** - Clear arrange-act-assert pattern
5. **Migrated from vi.stubGlobal** - Fixed previous anti-pattern of stubbing global fetch

### ⚠️ Issues Found

#### 1. **Artificial Timeout in Test** (CRITICAL - Bad Smell #10)
**Location:** `turbo/apps/workspace/src/views/project/__tests__/project-page.test.tsx:121`

```typescript
await expect(
  screen.findByText('📄 README.md', {}, { timeout: 5000 }),
).resolves.toBeInTheDocument()
```

**Issue:** This violates **Bad Code Smell #10: Artificial Delays in Tests**

From spec/bad-smell.md:
> Tests should NOT contain artificial delays... Delays and fake timers mask actual race conditions that should be fixed.

**Recommendation:** Remove the custom timeout. If the test needs 5 seconds, there's an underlying issue:
```typescript
// ✅ Good: Use default timeout
await expect(
  screen.findByText('📄 README.md')
).resolves.toBeInTheDocument()
```

If this fails with default timeout, it indicates:
- The component has performance issues
- There's a race condition that needs fixing
- The test setup is incorrect

The custom timeout masks these real problems.

#### 2. **Added yjs as devDependency** (Minor - YAGNI Concern)
**Location:** `turbo/apps/workspace/package.json:56`

```json
"yjs": "^13.6.27"
```

**Issue:** While this is used in tests, consider if YJS test data creation could be extracted to a shared test helper in the `@uspark/core` package instead of adding it as a dependency to each workspace app.

**Observation:** This is acceptable for now but watch for duplication if other apps need YJS test data.

### 💡 Positive Changes

#### Fixed Global Fetch Stubbing Anti-Pattern
**Before:**
```typescript
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Test error')))
```

**After:**
```typescript
server.use(
  http.get('*/api/projects/:projectId', () => {
    return HttpResponse.error()
  }),
)
```

This is a significant improvement! Using MSW instead of stubbing globals is the correct approach.

## Bad Code Smell Checklist

| Category | Status | Notes |
|----------|--------|-------|
| Mock Analysis | ✅ Pass | Uses MSW, not manual mocks |
| Test Coverage | ✅ Pass | Good coverage of file display |
| Error Handling | ✅ Pass | No over-engineering |
| Interface Changes | ✅ N/A | Test-only changes |
| Timer/Delays | ❌ **FAIL** | Uses custom 5000ms timeout |
| Dynamic Imports | ✅ Pass | No dynamic imports |
| Database Mocking | ✅ Pass | Not mocking globalThis.services |
| TypeScript `any` | ✅ Pass | No `any` types used |
| Lint Suppressions | ✅ Pass | No suppressions |
| Artificial Delays | ❌ **FAIL** | Custom timeout violates guidelines |

## Recommendations

### High Priority
1. **Remove custom timeout** - Let the test use default timeouts
   ```typescript
   // Remove the { timeout: 5000 } parameter
   await expect(
     screen.findByText('📄 README.md')
   ).resolves.toBeInTheDocument()
   ```

### Medium Priority
None

### Low Priority
1. Consider extracting YJS test helpers to shared package if other apps need it

## Overall Assessment

**Rating:** ⚠️ Good with Issues

This commit demonstrates good testing practices by migrating from global fetch stubbing to MSW. The test structure is solid and uses real YJS documents instead of mocks. However, it violates project guidelines by using a custom 5-second timeout, which masks potential performance or race condition issues.

The custom timeout is a **critical issue** according to the project's bad code smell guidelines and should be removed. If the test fails with default timeout, the underlying issue should be fixed rather than increasing the timeout.

**Action Required:** Remove the custom timeout to comply with project standards.
