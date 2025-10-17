# Code Review: 7d13f3e - refactor: extract initial scan status to separate api endpoint

## Summary

This commit refactors the initial scan progress functionality by extracting it from the general `GET /api/projects` endpoint into a dedicated `GET /api/projects/[projectId]/initial-scan` endpoint. The changes:

- Create new endpoint `/api/projects/[projectId]/initial-scan` that returns scan status, progress, and turn status
- Remove `initial_scan_progress` and `initial_scan_turn_status` from the main projects list endpoint
- Update frontend components to fetch scan data from the new endpoint separately
- Move comprehensive tests from `route.test.ts` to new endpoint's test file
- Update schema contracts to reflect the separation of concerns

This refactoring improves API design by separating frequently-polled scan progress data from the general project list, reducing unnecessary database queries for blocks and turns when listing projects.

## Bad Code Smell Analysis

### 1. ✅ Mock Analysis - No issues found

- Uses `vi.mock("@clerk/nextjs/server")` for authentication mocking, which is appropriate for testing auth flows
- No fetch API mocking detected (correctly uses MSW in frontend tests)
- All mocks are necessary for testing authentication scenarios

### 2. ✅ Test Coverage - Excellent

**New endpoint tests** (`/api/projects/[projectId]/initial-scan/route.test.ts`):
- Comprehensive coverage including:
  - Authentication/authorization scenarios (401 responses)
  - Project not found (404)
  - Project ownership validation
  - Null values for projects without scans
  - TodoWrite block parsing
  - Fallback to lastBlock when no TodoWrite exists
  - Skipping progress fetch for completed scans

**Updated tests** demonstrate good refactoring:
- Removed duplicate test logic from `route.test.ts`
- Updated frontend tests to mock both endpoints appropriately
- Tests verify the separation of concerns

### 3. ✅ Error Handling - No issues found

- Follows fail-fast principle - no unnecessary try/catch blocks
- Errors propagate naturally to framework error handlers
- Frontend gracefully handles fetch failures with try/catch for UI error states only

### 4. ✅ Interface Changes - Well documented

**New API contract** (`InitialScanResponseSchema`):
```typescript
{
  initial_scan_status: enum | null,
  initial_scan_progress: object | null,
  initial_scan_turn_status: enum | null
}
```

**Breaking change** (acceptable):
- `GET /api/projects` no longer returns `initial_scan_progress` and `initial_scan_turn_status`
- Frontend updated accordingly to use new endpoint
- Tests updated to reflect new contract

### 5. ✅ Timer and Delay Analysis - No issues found

- No artificial delays introduced
- No fake timers used
- Existing `SCAN_POLL_INTERVAL_MS = 3000` remains unchanged
- All async operations are properly awaited

### 6. ✅ Dynamic Import Analysis - Not applicable

No dynamic imports in this commit.

### 7. ✅ Database and Service Mocking in Web Tests - No issues found

Tests properly use real database:
```typescript
initServices();
const db = globalThis.services.db;
await db.update(PROJECTS_TBL)...
```

No mocking of `globalThis.services` detected. All database operations use actual database connections.

### 8. ✅ Test Mock Cleanup - Excellent

All test files include proper mock cleanup:
```typescript
beforeEach(async () => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  createdProjectIds.length = 0;
});
```

### 9. ✅ TypeScript `any` Type Usage - No issues found

No `any` types detected. Code uses:
- `unknown[]` for flexible types (e.g., `todos?: unknown[]`)
- Proper type narrowing with type guards
- Explicit type assertions where necessary

### 10. ✅ Artificial Delays in Tests - No issues found

No `setTimeout`, `new Promise(resolve => setTimeout(...))`, or `vi.useFakeTimers()` detected in tests.

### 11. ✅ Hardcoded URLs and Configuration - No issues found

- All test URLs use `http://localhost:3000` which is standard for Next.js testing
- No hardcoded production URLs
- No environment-specific configuration issues

### 12. ❌ Direct Database Operations in Tests - Issues found

**Line 143-146** in `/api/projects/[projectId]/initial-scan/route.test.ts`:
```typescript
await db
  .update(SESSIONS_TBL)
  .set({ type: "initial-scan" })
  .where(eq(SESSIONS_TBL.id, sessionId));
```

**Line 149-157** in `/api/projects/[projectId]/initial-scan/route.test.ts`:
```typescript
await db
  .update(PROJECTS_TBL)
  .set({
    sourceRepoUrl: "owner/repo",
    sourceRepoInstallationId: 12345,
    initialScanStatus: "running",
    initialScanSessionId: sessionId,
  })
  .where(eq(PROJECTS_TBL.id, projectId));
```

**Similar issues** appear in lines 249-252, 255-261, and 337-342.

**Issue**: Tests directly update database state instead of using API endpoints. This:
- Duplicates business logic that may exist in API endpoints
- Makes tests brittle to schema changes
- Bypasses validation and business rules that might be enforced by API endpoints

**Note**: While there may not be dedicated API endpoints for these specific operations (marking session type, updating scan status), the tests should ideally set up state through the public API surface. However, for internal state markers like `session.type = "initial-scan"` which may not have a public API, direct DB operations might be acceptable for test setup.

### 13. ✅ Avoid Fallback Patterns - No issues found

No fallback patterns detected. Code fails fast when data is missing:
```typescript
if (projects.length === 0) {
  return NextResponse.json(
    { error: "project_not_found", error_description: "Project not found" },
    { status: 404 }
  );
}
```

### 14. ✅ Prohibition of Lint/Type Suppressions - No issues found

No suppression comments detected:
- No `eslint-disable`
- No `@ts-ignore` or `@ts-nocheck`
- No `prettier-ignore`

### 15. ❌ Avoid Bad Tests - Minor issues found

**Line 42-54** in `/api/projects/[projectId]/initial-scan/route.test.ts`:
```typescript
it("should return 401 when user is not authenticated", async () => {
  mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
  const response = await GET(new NextRequest("http://localhost:3000"), {
    params: Promise.resolve({ projectId: "test-project-id" }),
  });
  const data = await response.json();
  expect(response.status).toBe(401);
  expect(data.error).toBe("unauthorized");
});
```

**Line 56-64**:
```typescript
it("should return 404 when project does not exist", async () => {
  const response = await GET(new NextRequest("http://localhost:3000"), {
    params: Promise.resolve({ projectId: "non-existent-project" }),
  });
  const data = await response.json();
  expect(response.status).toBe(404);
  expect(data.error).toBe("project_not_found");
});
```

**Line 66-93**:
```typescript
it("should return 401 when project belongs to another user", async () => {
  // ... test implementation
  expect(response.status).toBe(401);
  expect(data.error).toBe("unauthorized");
});
```

**Issue**: Over-testing error responses. Per bad smell #15, these tests focus on HTTP status codes rather than meaningful error handling behavior. While having basic auth/not-found tests is acceptable, the pattern of testing every error status (401 unauthorized, 404 not found, 401 wrong user) is repetitive boilerplate.

**Counter-argument**: These tests do verify authorization logic (not just status codes), which is important security testing. They're not purely testing HTTP responses, but actual auth/authz behavior.

**Verdict**: Minor issue - tests are somewhat verbose but they do verify meaningful authorization behavior, not just status codes.

## Overall Assessment

- **Overall Quality**: Good
- **Risk Level**: Low
- **Recommended Actions**:
  1. **Optional**: Consider whether direct database operations in tests could be replaced with API calls for better test isolation
  2. **Optional**: Review if all three auth error tests (unauthenticated, not found, wrong user) are necessary or if they could be consolidated

## Detailed Findings

### Positive Patterns Observed

1. **Excellent separation of concerns**: Moving scan progress to a dedicated endpoint is good API design
   - Reduces payload size for project listings
   - Allows independent polling of scan progress
   - Cleaner contract separation

2. **Strong test migration**: Tests were properly moved from the old location to the new endpoint's test file
   - No test coverage was lost
   - Tests were updated to reflect new API structure
   - Frontend tests properly mock both endpoints

3. **Type safety maintained**: All TypeScript types properly updated
   - New `InitialScanResponse` type exported
   - Schema validation using Zod
   - No `any` types introduced

4. **Clean code removal**: Old `getInitialScanProgress` function was removed from the projects route and properly moved to the new endpoint
   - No dead code left behind
   - Imports cleaned up (removed TURNS_TBL, BLOCKS_TBL, desc from projects route)

5. **Frontend properly updated**: All three affected components updated:
   - `page.tsx` (init page) - fetches from new endpoint
   - `page.test.tsx` - mocks new endpoint
   - `projects/page.tsx` - uses new endpoint for navigation logic

### Areas for Consideration

1. **Test setup complexity**: Tests create complex state through multiple API calls and direct DB updates. While this ensures realistic scenarios, it makes tests harder to understand and maintain.

2. **API call patterns in frontend**: The `navigateToProject` function in `projects/page.tsx` became async to fetch scan data, which is a minor architectural change. Consider if this could impact performance when clicking multiple projects rapidly.

3. **Polling optimization**: The new endpoint is called repeatedly during polling. Ensure database indexes are optimized for these queries (session ID lookups, turn status queries, block queries ordered by created_at).

### Security Considerations

✅ Authorization properly checked:
- User authentication verified
- Project ownership validated (checks if project belongs to user)
- No data leakage to unauthorized users

### Performance Considerations

✅ Performance improved:
- Main project listing endpoint no longer queries blocks/turns tables
- Scan progress only fetched when needed
- Completed scans skip progress fetching

## Conclusion

This is a well-executed refactoring with strong test coverage and proper separation of concerns. The only notable issues are:
1. Direct database operations in tests (minor concern, may be acceptable for test setup)
2. Slightly verbose error response testing (very minor concern)

Both issues are minor and don't pose significant risks. The code quality is high overall.
