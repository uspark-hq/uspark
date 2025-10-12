# Review: e53b0db

**Commit:** fix(e2b): disable timeout for sandbox command execution (#486)
**Type:** Bug Fix
**Files Changed:** turbo/apps/web/src/lib/e2b-executor.ts

## Summary

Disables E2B SDK's default 60-second timeout for long-running operations by setting `timeoutMs: 0` in two locations:
1. `initializeSandbox` - for `uspark pull --all` command
2. `executeClaude` - for background Claude execution

Also removes unused `onStdout` and `onStderr` callbacks from the Claude execution command.

## Changes

### turbo/apps/web/src/lib/e2b-executor.ts:184
Added `{ timeoutMs: 0 }` to allow unlimited time for project pull operations:
```typescript
const result = await sandbox.commands.run(
  `cd ~/workspace && uspark pull --all --project-id "${projectId}" --verbose 2>&1 | tee /tmp/pull.log`,
  { timeoutMs: 0 },
);
```

### turbo/apps/web/src/lib/e2b-executor.ts:272-275
Added `timeoutMs: 0` and removed unused callbacks:
```typescript
await sandbox.commands.run(command, {
  background: true,
  timeoutMs: 0,
});
```

## Analysis

### Timer and Delay Analysis
**Status:** ✓ Clean

The timeout removal is appropriate:
- E2B SDK's default 60-second timeout was causing legitimate long-running operations to fail
- Operations like `uspark pull` for large projects and extended Claude sessions can legitimately exceed 60 seconds
- The sandbox itself has a 30-minute lifetime limit, which provides an upper bound
- This is not an artificial delay or workaround - it's properly configured timeout handling

### Code Cleanup
**Status:** ✓ Clean

Removed unused `onStdout` and `onStderr` callbacks from background execution:
- These callbacks were logging but not being used for any business logic
- For background execution, the command continues after client disconnect anyway
- The output is handled through turn callbacks/blocks, not through command stdout
- Good cleanup following YAGNI principle

## Issues Found

None

## Verdict

✓ Clean - Appropriate timeout configuration for long-running operations
