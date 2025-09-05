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

---

*Last updated: 2025-09-05*