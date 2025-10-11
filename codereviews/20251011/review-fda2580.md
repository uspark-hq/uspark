# Code Review: fda2580

## Summary
Fixes race condition in sequence number assignment for turn blocks by adding database transaction locking and a unique constraint. This prevents duplicate sequence numbers when concurrent requests process Claude stdout callbacks.

## Error Handling
**Good**: Properly implements fail-fast pattern. The transaction will naturally fail if the unique constraint is violated, which is the correct behavior. No unnecessary try/catch blocks added.

## Interface Changes
- Modified `saveBlock()` function signature to accept transaction context (`tx`) as first parameter
- API contract remains unchanged from external perspective

## Test Coverage
**Good**: Test improvements include:
- Fixed test setup to properly mock headers before route calls (prevents race conditions in tests)
- Added test for rejecting requests without CLI token
- Tests verify auth mocking behavior correctly

**Issue Detected**: The test for "should reject requests without CLI token" unnecessarily resets mocks mid-test:
```typescript
mockHeaders.mockReset();
mockAuth.mockReset();
```
This could be avoided by having separate test suites with different setup, but the current approach is acceptable.

## Database Design
**Good**:
- Transaction with `FOR UPDATE` provides row-level locking
- Unique constraint `(turn_id, sequence_number)` adds database-level defense
- Implementation correctly handles PostgreSQL limitation (cannot use FOR UPDATE with aggregates)

## Bad Smells Detected
None. The implementation follows all guidelines:
- No defensive try/catch blocks
- Proper fail-fast behavior
- No artificial delays or fake timers
- Transaction handling is clean and necessary
- Test improvements fix actual race conditions

## Recommendations
1. Consider adding a comment in the test explaining why mock reset is necessary for the "reject without token" test
2. The migration file name "0010_fat_ultron.sql" is auto-generated but consider using more descriptive names for manual migrations in the future
