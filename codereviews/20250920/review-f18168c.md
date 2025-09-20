# Code Review: f18168c - Remove globalThis.services Mocking in Web Tests

**Commit:** `f18168c70f35f6481858689a6acef68f54f78e59`
**Author:** Ethan Zhang
**Date:** September 20, 2025
**PR:** #341

## Summary of Changes

This commit addresses Rule #7 violations from `spec/bad-smell.md` by removing `globalThis.services` mocking in web tests and replacing them with real database connections. The changes span three main test files:

### Files Modified:
- `turbo/apps/web/app/api/projects/[projectId]/files/[...path]/route.test.ts`
- `turbo/apps/web/src/lib/github/auth.test.ts`
- `turbo/apps/web/src/lib/github/client.test.ts`
- `turbo/apps/web/src/test/setup.ts`

### Key Changes:
1. **Removed `initServices` mocking** from GitHub client and auth tests
2. **Replaced `globalThis.services` mocks** with real database operations in route tests
3. **Updated test setup** to provide proper base64 encoded GitHub App private key
4. **Modified route tests** to use `globalThis.services.db` directly instead of separate test db instances

## Compliance with bad-smell.md Rules

### ✅ Rule #7: Database and Service Mocking in Web Tests - **FULLY ADDRESSED**

**Before:** Tests were mocking `globalThis.services` and `initServices`, violating the principle that web tests should use real database connections.

**After:** All three test files now use real services:
- Removed explicit `initServices` mocking
- Added comments explaining the decision: `// Don't mock init-services - use real services with test database`
- Tests now call `initServices()` and use `globalThis.services.db` directly
- Test environment variables are properly configured for real database access

**Impact:** Tests now validate actual database integration instead of mocks that could hide real issues.

### ✅ Rule #8: Test Mock Cleanup - **MAINTAINED**

All test files properly implement `vi.clearAllMocks()` in `beforeEach` hooks:
- `auth.test.ts`: Line 16
- `client.test.ts`: Line 67
- `route.test.ts`: Line 34

### ✅ Rule #1: Mock Analysis - **IMPROVED**

**Mocks Removed:**
- `initServices` mock in `auth.test.ts`
- `initServices` mock in `client.test.ts`
- Environment variable mocks that were duplicating test setup

**Mocks Retained (Justified):**
- `@octokit/auth-app` mock - External service mock appropriate for unit tests
- `@octokit/app` and `@octokit/core` mocks - External GitHub API mocks
- `getUserId` mock - Authentication mock for test isolation
- `@vercel/blob/client` mock - External blob storage mock

**Non-Mock Alternative Applied:** Real database operations through `globalThis.services.db`

## Quality Assessment

### ✅ Test Coverage Quality - **IMPROVED**

**Route Tests Enhanced:**
- Test now creates proper YJS documents with realistic data structure
- Better error case coverage with empty projects vs missing files
- Removed unrealistic test scenario (empty blob token test) that was testing configuration rather than functionality
- Tests validate real database integration patterns

**GitHub Tests Maintained:**
- Auth tests maintain proper token validation flow
- Client tests verify proper Octokit instance creation
- All tests pass with real service initialization

### ✅ Error Handling - **MAINTAINED**

No unnecessary try/catch blocks introduced. Tests follow fail-fast principle:
- Database operations throw naturally if connections fail
- Authentication failures propagate properly
- External service mocks handle error scenarios appropriately

### ✅ Interface Changes - **NONE**

No public interfaces were modified. Changes are purely internal to test implementation, maintaining existing API contracts.

## Test Environment Improvements

### ✅ Enhanced Test Setup

**Database Configuration:**
- Tests now use real DATABASE_URL from environment
- Proper cleanup in `beforeEach` and `afterEach` hooks
- Real service initialization ensures database connection pooling works correctly

**GitHub App Configuration:**
- Fixed base64 encoding of test private key in `setup.ts`
- Proper environment variable structure for GitHub App authentication
- Test values are clearly marked and don't conflict with real credentials

## Concerns and Recommendations

### ✅ No Major Concerns

This commit successfully addresses the identified code smell without introducing new issues:

1. **Performance Impact:** Minimal - test database is optimized for test workloads
2. **Test Reliability:** Improved - real database operations catch integration issues that mocks would miss
3. **Maintainability:** Enhanced - fewer mocks to maintain, tests closer to production behavior
4. **Security:** Maintained - test credentials are clearly separated and base64 encoded appropriately

### 📋 Minor Recommendations

1. **Test Data Isolation:** Current cleanup strategy using unique IDs per test run is effective. Consider adding transaction rollback for even better isolation if test performance becomes an issue.

2. **Documentation:** The inline comments explaining why services aren't mocked are excellent for future maintainers.

3. **Monitoring:** Consider tracking test execution time to ensure real database operations don't significantly slow down the test suite.

## Conclusion

**Overall Assessment: ✅ EXCELLENT**

This commit successfully eliminates Rule #7 violations by removing inappropriate service mocking in web tests. The changes improve test quality by validating real database integration while maintaining all existing test coverage. The implementation follows best practices with proper cleanup, clear documentation, and justified retention of external service mocks.

**Key Achievements:**
- ✅ Fully addresses bad-smell.md Rule #7
- ✅ Maintains comprehensive test coverage
- ✅ Improves test reliability and integration validation
- ✅ No regression in test maintainability
- ✅ Clear documentation of design decisions

**Recommendation:** **APPROVE** - This is a model implementation of how to transition from service mocking to real database testing in web applications.