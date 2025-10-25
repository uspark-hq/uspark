# Technical Debt

This document tracks known technical debt in the codebase that should be addressed in future iterations.

## ContractFetch Metadata Access

**Created**: 2025-10-25

**Problem**: The current `contractFetch` implementation only returns business data (response body) and doesn't expose response headers, status, or the Response object. This forces some call sites to use native `fetch` instead when they need access to response headers like `X-Version`.

**Current Workaround**:

- 3 call sites currently use native `fetch` to access response headers:
  - `DocStore.sync()` - needs X-Version header
  - `ProjectSync.syncFromRemote()` - needs X-Version header
  - `ProjectSync.syncToRemote()` - needs X-Version header
- 34+ other call sites use `contractFetch` successfully without needing headers

**Proposed Solution**: Create a unified `withMeta` pattern for contractFetch that returns:

```typescript
{
  data: T,
  headers: Headers,
  status: number
}
```

**Migration Path**:

1. Add new `contractFetchWithMeta` function (non-breaking)
2. Gradually migrate the 3 call sites that need headers
3. Consider whether to make metadata the default behavior
4. Existing 34+ call sites can remain unchanged during migration

**Impact**: Low urgency, but would improve API consistency and reduce the need for mixing `contractFetch` and native `fetch` in the codebase.
