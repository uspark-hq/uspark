# Technical Debt Tracking

This document tracks technical debt items that need to be addressed in the codebase.

## Environment Variable Usage
**Issue:** Code outside of Node.js scripts (like drizzle.config) should not use `process.env` directly.
**Solution:** Replace all `process.env` usage in web code with `env()` function calls.
**Files to check:** All web application code excluding Node.js configuration scripts.

## CLI Script Optimization  
**Issue:** The `claude-watch` CLI script uses `spawn` unnecessarily.
**Solution:** Refactor to directly call the corresponding methods instead of spawning processes.
**Location:** CLI scripts, specifically claude-watch implementation.

## Promise-based Delays
**Issue:** Manual promise-based setTimeout patterns like `await new Promise((resolve) => setTimeout(resolve, 5000))`.
**Solution:** Replace with `await delay(5000)` from the `signal-timers` module.
**Files to check:** Search for `new Promise` patterns with setTimeout.

## Mock Usage in Tests
**Issue:** Tests use `vi.mock()` for the config module, which can be avoided.
**Solution:** Refactor the config module to:
  - Create a function that reads from an `overrideConfig` object first
  - Export a `setOverrideConfig` method to write to this object
  - Allow dynamic config adjustment in tests without mocking
**Example to replace:**
```javascript
vi.mock("../config", () => ({
  getToken: vi.fn().mockResolvedValue("test_token"),
  getApiUrl: vi.fn().mockResolvedValue("http://localhost:3000"),
  // ... other mocks
}));
```

## GitHub Actions Tool Installation
**Issue:** Potential duplication between tools installed in Dockerfile and GitHub Actions.
**Tasks:**
  - Confirm Neon CLI is no longer manually installed in actions
  - Audit all tools installed in actions vs Dockerfile
  - Remove duplicate installations from actions if already in Dockerfile
**Files to check:** `.github/workflows/` directory and Dockerfile.

## Test Coverage Gap ✅
**Issue:** Commit 41e4ac8 may lack adequate test coverage.
**Solution:** Review the changes in commit 41e4ac8 and add appropriate test coverage.
**Status:** ✅ Resolved on 2025-09-05
**Resolution:** Added comprehensive test coverage for the public document share viewer page with 8 test cases covering all functionality including loading states, markdown/non-markdown file display, download functionality, and error handling.

---

*Last updated: 2025-09-05*