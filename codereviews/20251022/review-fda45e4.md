# Code Review: test(core): remove timeout test in contract-fetch-simple

**Commit:** fda45e40ed77ef40960e3da94c549bed10caf095
**Date:** Wed Oct 22 14:51:56 2025 -0700
**Author:** Ethan Zhang <ethan@uspark.ai>

## Summary

This commit removes a problematic test that was timing out in the CI environment. The removed test attempted to make real HTTP requests to an external API (https://api.example.com) to verify URL construction. Additionally, an eslint-disable comment was added to suppress a warning about an unused variable.

**Changes:**
- Removed test "should build correct request URL with path params" (lines 69-81)
- Added `// eslint-disable-next-line @typescript-eslint/no-unused-vars` for `simpleContract` variable

## Review Against Bad Code Smells

### 1. Mock Analysis

**Status:** ✅ PASS - Test Removed, Not Added

The commit removes a test rather than adding mocks. The removed test was attempting real network calls instead of using proper mocking with MSW, which aligns with the guideline that fetch API mocking should use MSW.

**No new mocks introduced.**

### 2. Test Coverage

**Status:** ⚠️ CONCERN - Test Coverage Reduced

**Issue:** The removed test was attempting to verify an important behavior - correct URL construction with path parameters.

**Analysis of removed test (lines 69-81):**
```typescript
it("should build correct request URL with path params", async () => {
  // 使用实际的 fetch API 测试 URL 构建
  // 这会失败但我们可以捕获错误来验证 URL
  try {
    await contractFetch(simpleContract.getUser, {
      baseUrl: "https://api.example.com",
      params: { id: "user123" },
    });
  } catch (error) {
    // 由于没有实际的服务器，会失败，但我们可以检查错误
    expect(error).toBeDefined();
  }
});
```

**Problems with the removed test:**
1. Made real HTTP requests to external API
2. Only verified that an error was thrown, not that URL was correct
3. Did not actually validate URL construction logic
4. Would timeout in CI environment without network access

**Missing coverage:** There is now no test verifying that `contractFetch` correctly builds URLs with path parameters.

**Recommendation:** Replace this test with a proper unit test that:
- Uses MSW to mock the HTTP endpoint
- Captures the actual request URL
- Verifies the URL contains the correct path parameter substitution
- Doesn't make real network calls

### 3. Error Handling

**Status:** N/A - Test Removal Only

No error handling changes in production code.

### 4. Interface Changes

**Status:** ✅ PASS - No Interface Changes

No changes to public interfaces. This only affects test code.

### 5. Timer and Delay Analysis

**Status:** ✅ PASS - No Timers

No timers or delays added. The test was removed because it was timing out due to real network calls, not because of artificial delays.

### 6. Dynamic Imports

**Status:** ✅ PASS - No Dynamic Imports

No dynamic imports in this change.

### 7. Database and Service Mocking in Web Tests

**Status:** N/A - Not Web Test

This is a core package test, not a web application test, so this guideline doesn't apply.

### 8. Test Mock Cleanup

**Status:** N/A - No Mocks

No mocks are used in the remaining tests.

### 9. TypeScript `any` Usage

**Status:** ✅ PASS - No `any` Types

No `any` types introduced.

### 10. Artificial Delays in Tests

**Status:** ✅ PASS - No Delays

No artificial delays added. The test was removed to eliminate network-dependent timeouts.

### 11. Hardcoded URLs and Configuration

**Status:** N/A - Test Code Only

The removed test contained a hardcoded URL (`https://api.example.com`), but since the test was deleted, this is no longer an issue.

### 12. Direct Database Operations in Tests

**Status:** N/A - No Database Operations

This test doesn't involve database operations.

### 13. Fail Fast Pattern

**Status:** N/A - Test Code Only

No changes to production error handling.

### 14. Lint Suppressions

**Status:** ❌ CRITICAL VIOLATION - Suppression Added

**Issue:** Line 9 adds a lint suppression:
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const simpleContract = c.router({
```

**Why this violates the standard:**
According to spec/bad-smell.md section 14:
> **ZERO tolerance for suppression comments** - fix the issue, don't hide it

The `simpleContract` variable is defined but never used in any of the remaining tests. The proper fix is to **remove the unused variable**, not suppress the warning.

**Root cause:** The variable was only used in the removed test. With that test gone, the variable serves no purpose.

**Required fix:**
```typescript
// Remove the entire simpleContract definition
// It's not used by any remaining tests
```

**Analysis of remaining tests:**
- Line 33-66: "should have correct type inference" - Uses inline contract definition, not `simpleContract`
- Line 68-82: "should handle ContractFetchError type" - Doesn't use `simpleContract`

Neither remaining test uses the `simpleContract` variable, confirming it should be deleted.

### 15. Bad Tests

**Status:** ⚠️ CONCERN - Removed Test Was Problematic

The removed test exhibited bad test patterns:

**❌ Fake test pattern:**
- Only verified that an error was thrown (`expect(error).toBeDefined()`)
- Did not verify the actual URL construction
- The test's comment even acknowledges it doesn't verify the URL: "这会失败但我们可以捕获错误来验证 URL" (This will fail but we can catch the error to verify URL)
- This is a fake test - it claims to verify URL building but actually just checks that errors exist

**❌ Real network dependency:**
- Made actual HTTP requests to external API
- Would fail/timeout without network access
- Should have used MSW for network mocking

**Good that it was removed:** Yes, this test was poorly designed and provided false confidence.

**Bad that it was removed:** The underlying functionality (URL construction with path params) should still be tested, just with proper mocking.

## Verdict

- **Status:** ❌ NEEDS REVISION
- **Critical Issues:**
  1. **Lint suppression must be removed** - Delete the unused `simpleContract` variable instead of suppressing the warning
  2. **Test coverage gap** - URL construction with path parameters is no longer tested

## Required Changes

### 1. Remove Lint Suppression (CRITICAL)

**Current code (lines 8-28):**
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const simpleContract = c.router({
  getUser: {
    method: "GET",
    path: "/users/:id",
    // ... rest of contract definition
  },
  createUser: {
    method: "POST",
    path: "/users",
    // ... rest of contract definition
  },
});
```

**Required fix:**
```typescript
// Delete the entire simpleContract definition
// It's not used by any remaining tests
```

Since neither remaining test uses `simpleContract`, it should be completely removed.

### 2. Add Proper Test for URL Construction (RECOMMENDED)

Replace the removed test with a proper unit test using MSW:

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("should build correct request URL with path params", async () => {
  // Capture the actual request URL
  let capturedUrl = '';

  server.use(
    http.get('https://api.example.com/users/:id', ({ request, params }) => {
      capturedUrl = request.url;
      return HttpResponse.json({ id: params.id, name: 'Test User' });
    })
  );

  // Create a simple contract for testing
  const testContract = c.router({
    getUser: {
      method: "GET",
      path: "/users/:id",
      responses: {
        200: z.object({ id: z.string(), name: z.string() }),
      },
    },
  });

  await contractFetch(testContract.getUser, {
    baseUrl: "https://api.example.com",
    params: { id: "user123" },
  });

  // Verify the URL was constructed correctly
  expect(capturedUrl).toBe('https://api.example.com/users/user123');
});
```

This test:
- Uses MSW to mock the HTTP endpoint (follows guideline #1)
- Captures the actual request URL
- Verifies correct path parameter substitution
- Doesn't make real network calls
- Actually tests the behavior, not just error existence

## Overall Assessment

This commit attempts to fix a CI timeout issue but introduces a **critical code smell** by adding a lint suppression instead of fixing the root cause. The test removal is justified (it was a bad test), but the lint suppression violates project standards.

**The commit cannot be merged as-is** due to the lint suppression. The unused variable must be deleted, and ideally, proper test coverage for URL construction should be added using MSW.

**Recommendation: REJECT** - Remove the lint suppression and delete the unused variable. Consider adding proper test coverage with MSW.
