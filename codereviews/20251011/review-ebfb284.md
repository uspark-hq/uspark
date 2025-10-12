# Review: ebfb284

**Commit:** fix(e2b): replace direct node_env access with dev token check (#490)
**Type:** Bug Fix
**Files Changed:**
- turbo/apps/web/src/lib/e2b-executor.ts
- turbo/apps/web/app/components/github-repo-selector.tsx

## Summary

Fixes bad smell #11 (Hardcoded URLs and Configuration) identified in previous code review by replacing direct `process.env.NODE_ENV` access with centralized `env().USPARK_TOKEN_FOR_DEV` check.

## Changes

### turbo/apps/web/src/lib/e2b-executor.ts:114-118, 220-224

**Before:**
```typescript
const isDevelopment = process.env.NODE_ENV === "development";
```

**After:**
```typescript
const isDevelopment = !!env().USPARK_TOKEN_FOR_DEV;
```

Applied in two locations:
1. `getSandboxForSession` method (line 118)
2. `executeClaude` method (line 224)

### turbo/apps/web/app/components/github-repo-selector.tsx:26-75

**Before:**
```typescript
const fetchRepositories = async () => { /* ... */ };

useEffect(() => {
  fetchRepositories();
}, []);
```

**After:**
```typescript
useEffect(() => {
  let isMounted = true;

  const fetchRepositories = async () => {
    // ... fetch logic with isMounted checks
  };

  fetchRepositories();

  return () => {
    isMounted = false;
  };
}, []);
```

## Analysis

### Hardcoded URLs and Configuration (Bad Smell #11)
**Status:** ✓ Fixed

**Previous Issue:**
Direct `process.env.NODE_ENV` access violated the project guideline to use centralized configuration via `env()` function.

**Solution:**
- Replaced with `!!env().USPARK_TOKEN_FOR_DEV` which:
  - Uses validated environment variables from centralized schema
  - More explicit about what triggers development mode
  - Follows project pattern consistently
  - Doesn't require adding NODE_ENV to schema

**Benefits:**
1. Eliminates direct process.env access
2. Uses existing validated environment variables
3. More explicit logic (dev mode = dev token present)
4. Better consistency with project patterns

### React Component Cleanup
**Status:** ✓ Good practice

The github-repo-selector.tsx changes add proper cleanup:
- Moves `fetchRepositories` inside useEffect for proper closure
- Adds `isMounted` flag to prevent state updates after unmount
- Returns cleanup function to set `isMounted = false`
- Prevents React warning: "Can't perform a React state update on an unmounted component"

This follows React best practices for async operations in effects.

## Issues Found

None

## Verdict

✓ Clean - Fixes bad smell #11 identified in code review and adds proper React cleanup
