# Code Review: 9f8f593

## Summary
Major architecture refactor migrating turn execution to async callback pattern. Eliminates Vercel function timeouts by running Claude execution in background E2B sandboxes with real-time stdout callbacks to create blocks.

## Interface Changes
**New API endpoint**:
- `POST /api/projects/:projectId/sessions/:sessionId/turns/:turnId/on-claude-stdout`
- Uses CLI token authentication
- Receives JSON stdout lines and creates blocks asynchronously

**CLI changes**:
- Added `--turn-id` and `--session-id` parameters to `watch-claude`
- Added `sendStdoutCallback()` function to POST stdout lines to API

## Architecture
**Excellent design**:
```
Vercel Function (short-lived) → E2B Sandbox (long-lived, background:true)
                                     ↓ stream stdout
                                 watch-claude
                                     ↓ HTTP callbacks
                                 Callback API (creates blocks)
```

This solves the timeout problem by decoupling execution from API response.

## Error Handling
**Good**:
- `sendStdoutCallback()` errors are caught and logged to stderr but don't affect main flow
- Non-blocking error handling is appropriate here
- API route has proper transaction handling for race conditions

## Test Coverage
**Comprehensive**:
- Callback API route tests (creates blocks, handles auth, validates input)
- CLI watch-claude tests (detects tool_use, sends callbacks, file sync)
- Sequence number management tests
- Turn status update tests

**Uses MSW properly**: Tests use MSW handlers for HTTP mocking (good practice per bad-smell.md #1).

## Mock Analysis
**Good mock usage**:
- MSW for HTTP interception (recommended approach)
- `stdoutCallbackSpy` to verify callback behavior
- Tests verify actual payloads, not just mock invocations
- ClaudeExecutor mocked in route tests (appropriate - prevents actual execution)

## E2B Integration
**Good**:
- Uses official `background: true` API for long-running commands
- Persistent listeners capture output correctly
- Combines race condition fixes from commit 33e1276

## Bad Smells Detected
None. This is a well-designed architectural improvement:
- Proper async/callback pattern
- Good separation of concerns
- Comprehensive test coverage
- No artificial delays or fake timers
- Error handling is appropriate (non-blocking for callbacks)
- Uses recommended MSW for HTTP mocking

## Recommendations
1. Document the callback timeout expectations (how long can callbacks take?)
2. Consider adding metrics/monitoring for callback failures in production
3. The test helpers from 010c9e1 are used here - confirms they're valuable shared utilities
