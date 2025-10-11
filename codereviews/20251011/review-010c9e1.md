# Code Review: 010c9e1

## Summary
Refactors on-claude-stdout route tests to follow bad-smell guidelines by removing direct database operations and consolidating error response tests. Extracts complex test setup into reusable helper functions.

## Test Coverage
**Excellent improvements**:
- Reduced beforeEach from 100+ lines to ~20 lines using helper functions
- Uses API endpoints (POST /projects, POST /sessions, POST /turns) instead of direct DB operations
- Consolidated 3 separate error response tests into 1 comprehensive auth test
- Fixed cleanup order to respect foreign key constraints (sessions before project)

**Helper functions added**:
- `setupTestAuth()`: Configures CLI token authentication mocks
- `createTestTurnContext()`: Creates complete test context using APIs

## Direct Database Operations
**Good**: Significantly reduces direct DB usage:
- Project creation: Uses API ✓
- Session creation: Uses API ✓
- Turn creation: Uses API ✓
- Claude tokens: Still uses direct DB (acceptable - no API endpoint exists)
- CLI tokens: Still uses direct DB (acceptable - no API endpoint exists)

This is the correct approach per bad-smell.md #12.

## Bad Smells Detected
None. This commit actively **fixes** bad smells:
- Addresses #12: Avoids direct database operations where API endpoints exist
- Addresses #15: Reduces over-testing of error response status codes (3 tests → 1)
- Improves test maintainability with helper functions

## Recommendations
1. Consider creating API endpoints for CLI token and Claude token management to eliminate remaining direct DB operations
2. The helper functions are well-designed and could be moved to a shared test utilities module if reused elsewhere
