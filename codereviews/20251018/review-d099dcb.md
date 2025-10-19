# Code Review: d099dcb - test: add coverage for watch-claude result block handling

**Commit**: d099dcbc62f24d5f3a41a48a8376aa68c847a32d
**Date**: 2025-10-17
**Author**: Ethan Zhang

## Summary
Adds test coverage for result block handling in watch-claude, creates test setup for CLI package, and fixes turn selection ordering in initial-scan API.

---

## Bad Code Smell Analysis

### 1. Mock Analysis ✅ PASS
- **MSW Server Setup**: Creates `turbo/apps/cli/apps/cli/src/test/setup.ts` with MSW server setup
  - Uses MSW (Mock Service Worker) for network mocking, which is the recommended approach
  - No fetch API mocking detected
- **Test Mocks**: Tests use `vi.fn()` for mocking `syncFile` and `stdoutCallbackSpy`
  - These are appropriate for unit testing internal callbacks
  - Not mocking external network calls (would use MSW for that)

**Verdict**: Proper mock usage - MSW for network, local spies for callbacks.

---

### 2. Test Coverage ✅ PASS
- **Comprehensive Coverage**: Adds 2 new test cases for result block handling
  - Tests both success scenario: `should send result block to callback API`
  - Tests failure scenario: `should send failed result block to callback API`
- **Missing vi.clearAllMocks()**: Tests do NOT include `vi.clearAllMocks()` in `beforeEach` hook
  - This violates smell #8 (Test Mock Cleanup)
  - Could lead to mock state leakage between tests

**Verdict**: Good coverage but missing mock cleanup (see #8 below).

---

### 3. Error Handling ✅ PASS
- No unnecessary try/catch blocks
- No over-engineered error handling
- Fail-fast approach maintained

---

### 4. Interface Changes ✅ PASS
- **API Enhancement**: Added `ORDER BY asc(TURNS_TBL.createdAt)` to initial-scan API
  - Non-breaking change - ensures consistent turn selection
  - Good practice for deterministic queries

---

### 5. Timer and Delay Analysis ⚠️ WARNING
- **vi.waitFor() Usage**: Tests use `vi.waitFor()` to wait for async callbacks
  ```typescript
  await vi.waitFor(
    () => {
      expect(stdoutCallbackSpy).toHaveBeenCalled();
    },
    {
      timeout: 1000,
      interval: 10,
    },
  );
  ```
- **Analysis**: This is acceptable as it's waiting for actual async behavior with assertions
- **Not a violation**: Different from `vi.useFakeTimers()` which manipulates time
- **Note**: Could potentially use a more deterministic approach with promises

**Verdict**: Acceptable use of waitFor for async testing, not fake timers.

---

### 6. Dynamic Import Analysis ✅ PASS
- **Dynamic Import in Tests**:
  ```typescript
  const { watchClaudeCommand } = await import("./watch-claude");
  ```
- **Justification**: Necessary in tests to ensure fresh module state after mocking stdin
- **Not a violation**: Test-specific pattern for module isolation

---

### 7. Database and Service Mocking in Web Tests ✅ PASS
- Tests are in `/turbo/apps/cli/` package, not `/apps/web/`
- Not applicable to this commit

---

### 8. Test Mock Cleanup ❌ FAIL
- **Missing vi.clearAllMocks()**: The test file does NOT include a `beforeEach` hook with `vi.clearAllMocks()`
- **Risk**: Mock state could leak between tests, causing flaky test behavior
- **Required Fix**: Add this to the test file:
  ```typescript
  beforeEach(() => {
    vi.clearAllMocks();
  });
  ```

**Verdict**: VIOLATION - Missing required mock cleanup.

---

### 9. TypeScript `any` Type Usage ✅ PASS
- No `any` types detected in the changes

---

### 10. Artificial Delays in Tests ✅ PASS
- No `setTimeout` or `new Promise(resolve => setTimeout(...))` delays
- Uses `vi.waitFor()` which waits for conditions, not fixed delays
- No fake timers (`vi.useFakeTimers()`)

---

### 11. Hardcoded URLs and Configuration ✅ PASS
- No hardcoded URLs or configuration values
- Dockerfile update uses specific version: `@uspark/cli@0.11.9`
  - This is appropriate for Docker - needs specific versions

---

### 12. Direct Database Operations in Tests ✅ PASS
- Tests operate at the command level, not direct DB operations
- Not applicable to these CLI tests

---

### 13. Avoid Fallback Patterns - Fail Fast ✅ PASS
- No fallback patterns detected
- Code follows fail-fast principles

---

### 14. Prohibition of Lint/Type Suppressions ✅ PASS
- No suppression comments detected:
  - No `// eslint-disable`
  - No `// @ts-ignore`
  - No `// @ts-expect-error`
  - No `// prettier-ignore`

---

### 15. Avoid Bad Tests ⚠️ MINOR CONCERN
- **Test Quality**: Tests verify actual behavior (callback invocation with correct data)
- **Not Over-Mocking**: Tests use minimal mocking - just stdin simulation and spy on callbacks
- **Good**: Tests verify the actual line is sent to callback, not just that callback was called
- **Minor Concern**: Tests manipulate `process.stdin` via `Object.defineProperty`
  - This is acceptable for testing stdin-reading code
  - Tests properly restore original stdin

**Verdict**: Tests are well-designed, minimal mocking, verify actual behavior.

---

## Summary of Findings

### Critical Issues (Must Fix)
1. **Missing Mock Cleanup** (#8): Test file lacks `vi.clearAllMocks()` in `beforeEach` hook

### Warnings
1. **vi.waitFor() Usage** (#5): Acceptable but could be more deterministic with promise-based approach

### Recommendations
1. Add `beforeEach(() => { vi.clearAllMocks(); })` to `watch-claude.test.ts`
2. Consider refactoring tests to use promise-based synchronization instead of `vi.waitFor()` if possible

### Overall Assessment
**MOSTLY CLEAN** - Good test coverage with proper MSW setup and minimal mocking. One critical violation: missing mock cleanup in beforeEach.

**Score**: 14/15 categories passed, 1 critical issue

---

## Suggested Fix

```typescript
// In turbo/apps/cli/src/commands/watch-claude.test.ts
// Add at the top of the describe block:

beforeEach(() => {
  vi.clearAllMocks();
});
```
