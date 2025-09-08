# Technical Debt Tracker

> **Goal**: Achieve zero direct database operations and artificial delays in tests

## Priority 1: Direct Database Operations in Tests 🔴

**Target**: Replace all direct database operations with API handlers

### Current Status
- **18+ test files** contain direct database operations
- All use `globalThis.services.db` directly, bypassing API layer
- Violates project architecture principles

### Files Requiring Refactoring

#### High Priority (Core API Tests)
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/projects/route.test.ts` | 116 | Direct DB insert | Create test helper using API |
| `apps/web/app/api/projects/[projectId]/sessions/route.test.ts` | 154 | Direct DB insert | Use POST /api/projects |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts` | 172 | Direct DB operations | Use session API endpoints |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts` | Multiple | Direct DB operations | Use turns API endpoints |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts` | 46, 54 | Direct DB operations | Use updates API |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts` | 44, 52, 340 | Direct DB operations | Use interrupt API |

#### Medium Priority (Share & Auth Tests)
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/share/[token]/route.test.ts` | 40, 48 | Direct DB insert | Use share creation API |
| `apps/web/app/api/share/route.test.ts` | 194 | Direct DB insert | Use share API |
| `apps/web/app/api/shares/route.test.ts` | 171, 180, 287 | Direct DB operations | Use shares API |
| `apps/web/app/api/shares/[id]/route.test.ts` | 78, 129, 137, 235 | Direct DB operations | Use share management API |

#### CLI Token Tests
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/app/api/cli/auth/tokens-list.test.ts` | 19, 107, 116 | Direct DB operations | Use token API |
| `apps/web/app/api/cli/auth/generate-token/route.test.ts` | 23, 152, 200, 211, 312 | Direct DB operations | Use token generation API |
| `apps/web/app/api/cli/auth/device/route.test.ts` | Multiple | Direct DB operations | Use device auth API |
| `apps/web/app/api/cli/auth/token/route.test.ts` | Multiple | Direct DB operations | Use token validation API |

#### Other Tests
| File | Lines | Pattern | Action Required |
|------|-------|---------|-----------------|
| `apps/web/src/lib/sessions/blocks.test.ts` | 186, 194, 201 | Direct DB insert | Create proper test fixtures |
| `apps/web/app/api/projects/[projectId]/blob-token/route.test.ts` | 87 | Direct DB insert | Use project creation API |
| `apps/web/app/api/projects/[projectId]/route.test.ts` | Multiple | Direct DB operations | Use project API |
| `apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts` | Multiple | Direct DB operations | Use turn API |

### Refactoring Strategy

1. **Create Test Helper Functions**
   ```typescript
   // Instead of:
   await globalThis.services.db.insert(PROJECTS_TBL).values({...})
   
   // Use:
   await createTestProject(userData)
   ```

2. **Use API Endpoints**
   ```typescript
   // Instead of direct DB:
   const response = await POST('/api/projects', { body: projectData })
   ```

3. **Leverage Existing API Handlers**
   - All test setup should go through the same code paths as production
   - This ensures tests validate actual user workflows

## Priority 2: Artificial Delays in Tests 🟡

**Target**: Remove all artificial delays and replace with deterministic assertions

### Current Status
- **7 test files** contain artificial delays
- Delays range from 10ms to 20ms
- Indicates timing-dependent test logic

### Files with Artificial Delays

| File | Line | Delay | Reason | Solution |
|------|------|-------|--------|----------|
| `sessions/route.test.ts` | 272, 310 | 10ms | "Ensure different timestamps" | Use mock timers or sequence IDs |
| `turns/[turnId]/route.test.ts` | 458 | 10ms | Timestamp differentiation | Use deterministic ordering |
| `turns/route.test.ts` | 354, 395, 406 | 10-20ms | Order dependency | Use proper event sequencing |
| `sessions/[sessionId]/route.test.ts` | 172 | 10ms | Timing issue | Fix underlying race condition |
| `interrupt/route.test.ts` | 247 | 10ms | State synchronization | Use proper async/await |
| `updates/route.test.ts` | 168, 180 | 10ms | Update ordering | Use transaction or batch updates |

### Why Artificial Delays Are Problematic

1. **Test Flakiness**: Tests may fail randomly based on system load
2. **Slow Test Suite**: Accumulated delays slow down CI/CD
3. **Hidden Bugs**: Masks actual race conditions in production code
4. **False Positives**: Tests may pass locally but fail in CI

### Refactoring Strategy

1. **Use Mock Timers**
   ```typescript
   // Instead of:
   await new Promise((resolve) => setTimeout(resolve, 10));
   
   // Use:
   vi.useFakeTimers();
   vi.advanceTimersByTime(10);
   ```

2. **Use Deterministic IDs**
   ```typescript
   // Instead of relying on timestamp differences:
   const turn1 = { id: generateId(), sequence: 1 };
   const turn2 = { id: generateId(), sequence: 2 };
   ```

3. **Wait for Specific Conditions**
   ```typescript
   // Instead of arbitrary delay:
   await waitFor(() => {
     expect(getSessionState()).toBe('ready');
   });
   ```

## Priority 3: Test Architecture Improvements 🟢

### Proposed Test Utilities

1. **Create `test-helpers.ts`**
   ```typescript
   export async function createTestProject(userId: string) {
     const response = await fetch('/api/projects', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${getTestToken(userId)}` },
       body: JSON.stringify({ name: 'Test Project' })
     });
     return response.json();
   }
   ```

2. **Implement Test Factories**
   ```typescript
   export const TestFactory = {
     project: (overrides = {}) => ({ ...defaultProject, ...overrides }),
     session: (overrides = {}) => ({ ...defaultSession, ...overrides }),
     turn: (overrides = {}) => ({ ...defaultTurn, ...overrides })
   };
   ```

3. **Use Test Transactions**
   - Wrap each test in a transaction that rolls back
   - Ensures test isolation without manual cleanup

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

## Notes

### Special Case: Authentication Tests
Some tests (e.g., `projects/route.test.ts:107`) acknowledge they need direct DB access because "API would create project for current authenticated user". These cases need special attention to create proper test utilities that can simulate different user contexts.

### Commit Reference
Initial technical debt identified in commit `2ffa295` review: While this commit improved the situation by replacing many manual database operations with API handlers, significant technical debt remains as documented above.

---

**Last Updated**: September 8, 2025  
**Next Review**: September 15, 2025  
**Owner**: Engineering Team