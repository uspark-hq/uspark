# Code Review: b1ea482

## Summary
Fixes test failure by replacing global fetch mock with proper MSW (Mock Service Worker) handlers for the stdout callback API endpoint.

## Mock Analysis
**Good Improvement**:
- **Removed**: Global fetch mock (`global.fetch = vi.fn()`)
- **Added**: Proper MSW handler for the specific API endpoint
- **Why this is better**: MSW provides request-level interception that matches production behavior more closely than mocking the global fetch function

**Spy Usage**:
- Added `stdoutCallbackSpy` to verify callback behavior
- Properly validates that callbacks are made with correct JSON payloads
- This is appropriate use of spies for verification, not just mocking

## Test Coverage
**Good**:
- Tests verify both the count of calls and the actual data sent
- Waits for both `syncFile` and `stdoutCallbackSpy` in `vi.waitFor`
- Assertions check actual payloads rather than just mock invocations

## Bad Smells Detected
None. This is a proper test improvement:
- Uses MSW which is the recommended approach (per bad-smell.md point #1)
- Assertions verify actual behavior, not just mock state
- No artificial delays added
- Proper use of `vi.waitFor` for async operations

## Recommendations
None. This is a good refactoring that improves test reliability and follows best practices.
