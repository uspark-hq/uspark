# Review: fix(web): use tool name for accurate result display and fix flaky tests

**Commit:** 883d939b7d07787722ba3c3a999622fbc210238c
**PR:** #672

## Summary
Refactors BlockDisplay component to use explicit tool name identification instead of regex-based format matching. Also fixes flaky GitHub API tests by improving installation ID generation.

## Code Smell Analysis

### 1. Mock Analysis
✅ No issues - No new mocks added

### 2. Test Coverage
✅ **Excellent** - Added comprehensive tests for the new block display behavior (Read tool summary, truncation, etc.)

### 3. Error Handling
✅ No issues - No error handling changes

### 4. Interface Changes
✅ No issues - Added `blocks` prop to BlockDisplay to enable tool name lookup

### 5. Timer and Delay Analysis
✅ No issues - No timers

### 6. Dynamic Imports
✅ No issues - No dynamic imports

### 7. Database Mocking
✅ No issues - No database mocking

### 8. Test Mock Cleanup
✅ No issues - Tests use vi.clearAllMocks() in beforeEach

### 9. TypeScript any Usage
✅ No issues - No `any` types

### 10. Artificial Delays
✅ No issues - No delays

### 11. Hardcoded URLs
✅ No issues - No hardcoded URLs

### 12. Direct DB Operations
✅ No issues - No direct DB operations in tests

### 13. Fallback Patterns
✅ No issues - No fallback logic

### 14. Lint Suppressions
✅ No issues - No suppressions

### 15. Bad Tests
✅ **Good improvement** - Removed fragile regex-based format detection and replaced with explicit tool identification. Test fixes for parallel execution are appropriate.

## Overall Assessment
**APPROVED**

## Recommendations
None - Excellent refactoring that removes code smell (regex matching) and improves test stability.
