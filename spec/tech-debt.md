# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

## Environment Variable Usage ✅
**Issue:** Code outside of Node.js scripts (like drizzle.config) should not use `process.env` directly.
**Solution:** Replace all `process.env` usage in web code with `env()` function calls.
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** Web application code properly uses `env()` function from `src/env.ts`. Only `env.ts` itself and test setup files use `process.env` directly, which is the correct pattern.

## CLI Script Optimization ✅
**Issue:** The `claude-watch` CLI script uses `spawn` unnecessarily.
**Solution:** Refactor to directly call the corresponding methods instead of spawning processes.
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** No `claude-watch` script or `spawn` usage found in the CLI codebase.

## Promise-based Delays ✅
**Issue:** Manual promise-based setTimeout patterns like `await new Promise((resolve) => setTimeout(resolve, 5000))`.
**Solution:** Replace with `await delay(5000)` from the `signal-timers` module.
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** No promise-based setTimeout patterns found in the codebase.

## Mock Usage in Tests ✅
**Issue:** Tests use `vi.mock()` for the config module, which can be avoided.
**Solution:** Refactor the config module to:
  - Create a function that reads from an `overrideConfig` object first
  - Export a `setOverrideConfig` method to write to this object
  - Allow dynamic config adjustment in tests without mocking
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** CLI config module already implements `setOverrideConfig` mechanism and tests properly use it instead of `vi.mock()`.

## GitHub Actions Tool Installation ✅
**Issue:** Potential duplication between tools installed in Dockerfile and GitHub Actions.
**Tasks:**
  - Confirm Neon CLI is no longer manually installed in actions
  - Audit all tools installed in actions vs Dockerfile
  - Remove duplicate installations from actions if already in Dockerfile
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** All GitHub Actions workflows use the pre-built Docker container `ghcr.io/uspark-hq/uspark-toolchain` which includes all necessary tools (pnpm, lefthook, vercel, neonctl). No duplicate installations in workflows.

## Test Coverage Gap ✅
**Issue:** Commit 41e4ac8 may lack adequate test coverage.
**Solution:** Review the changes in commit 41e4ac8 and add appropriate test coverage.
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** Added comprehensive test coverage for the public document share viewer page with 8 test cases covering all functionality including loading states, markdown/non-markdown file display, download functionality, and error handling.

## Unused Dependencies and Code (Knip Analysis)
**Issue:** Multiple unused dependencies, exports, and files detected by knip analysis.
**Detection:** Run `cd turbo && pnpm knip` to see current unused code elements.
**Status:** 🟡 In Progress (2025-09-06)
**Progress:**
- ✅ Cleaned up unused function exports (reduced from 16 to 2)
  - Removed 3 unused mock test handlers in CLI
  - Made MockYjsServer class private (internal use only)
  - Removed unused docs export from source.config.ts
  - Removed 11 unused file-explorer exports
  - Made getStoreIdFromToken private in blob utils
  - Removed unused test exports (clerkHandlers, bypass)
- 🔴 **Still pending:**
  - **Unused files:** 6 files listed in previous knip run (verify if still exist)
  - **Unused dependencies (6):**
    - apps/web: `@ts-rest/core`, `@ts-rest/serverless`, `@uspark/ui`, `dotenv`
    - packages/core: `yjs`
    - packages/ui: `react-dom`
  - **Unused devDependencies (4):**
    - apps/docs: `@uspark/typescript-config`
    - apps/web: `@testing-library/user-event`
    - packages/core: `@uspark/eslint-config`
    - packages/ui: `@types/react-dom`
  - **Remaining unused exports (2):**
    - `default` in apps/docs/source.config.ts
    - `FileExplorer` in apps/web/app/components/file-explorer/index.ts
  - **Unused type exports (9):** Various interfaces and types across the codebase

**How to Find Issues:**
```bash
# Run knip analysis to see all issues
cd turbo && pnpm knip

# Run with compact reporter for cleaner output
cd turbo && pnpm knip --reporter compact

# Check specific workspace
cd turbo && pnpm knip --workspace apps/web

# Auto-fix removable issues (use with caution)
cd turbo && pnpm knip:fix
```

**Resolution Plan:**
1. Review each unused item to determine if it's truly unused or needed for future features
2. Remove confirmed unused dependencies from package.json files
3. Delete unused files or add them to knip ignore patterns if needed
4. Clean up unused exports or mark as internal if required
5. Update knip.json configuration to handle false positives

---

*Last updated: 2025-09-06*