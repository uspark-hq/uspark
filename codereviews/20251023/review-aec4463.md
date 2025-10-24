# Code Review - aec4463

**Commit:** aec446359fe0ae70c8f766fe4aa9730ca3571fca
**Title:** fix(workspace): improve workers count display format
**PR:** #728

## Summary
Duplicate commit of #726 (41400aa). Makes the same change to workers count display format, replacing badge with inline text. Also includes lefthook.yml configuration changes for knip pre-commit hook.

## Changes
- `turbo/apps/workspace/src/views/project/workers-popover.tsx` - Same as #726
- `turbo/lefthook.yml` - NEW: Added knip configuration with cache, timeout, and skip settings

## Code Review Findings

### 1. Mock Analysis
✅ No issues found - No mocking

### 2. Test Coverage
⚠️ **Same issue as #726**: No tests added for display format changes

### 3. Error Handling
✅ No issues found - Simple UI change

### 4. Interface Changes
✅ No issues found - Same interface maintained

### 5. Timer and Delay Analysis
✅ No issues found - No timers

### 6. Dynamic Imports
✅ No issues found - Static imports only

### 7. Database/Service Mocking
✅ No issues found - No database operations

### 8. Test Mock Cleanup
✅ No issues found - No test changes

### 9. TypeScript `any` Usage
✅ No issues found - No `any` usage

### 10. Artificial Delays in Tests
✅ No issues found - No test modifications

### 11. Hardcoded URLs
✅ No issues found - No URLs

### 12. Direct Database Operations in Tests
✅ No issues found - No test changes

### 13. Fallback Patterns
✅ No issues found - No fallbacks

### 14. Lint/Type Suppressions
✅ No issues found - No suppressions

### 15. Bad Tests
✅ No issues found - No tests (which is itself an issue)

## Additional Analysis: lefthook.yml Changes

### Knip Pre-commit Hook Configuration:
```yaml
knip:
  root: turbo/
  run: pnpm knip --cache --no-exit-code
  glob: "turbo/**/*.{js,ts,tsx,jsx,json}"
  skip:
    - merge
    - rebase
  fail_text: "Knip found unused code. Run 'cd turbo && pnpm knip' to see details."
  timeout: 60
```

**Analysis:**
- `--cache`: Good - speeds up subsequent runs
- `--no-exit-code`: ⚠️ **Issue** - Prevents knip from failing the commit even when issues found
  - This undermines the purpose of a pre-commit hook
  - Should fail the commit when unused code is detected
  - The `fail_text` suggests it should fail, but `--no-exit-code` prevents this
- `timeout: 60`: Reasonable 60-second timeout
- `skip: [merge, rebase]`: Good - avoids interference with git operations

## Overall Assessment
**Quality Rating:** Fair (duplicate commit + knip configuration issue)

**Issues:**
1. This appears to be a duplicate of commit 41400aa (#726) - same code change
2. The knip hook uses `--no-exit-code` which prevents it from failing commits
3. Missing test coverage (same issue as original commit)

**Positive:**
1. Lefthook integration for knip is a good addition
2. Appropriate skip conditions for merge/rebase
3. Helpful fail_text message

## Recommendations

1. **Fix knip configuration**: Remove `--no-exit-code` flag
   ```yaml
   run: pnpm knip --cache  # Remove --no-exit-code
   ```

2. **Add tests** for the workers count display (same as #726 recommendation)

3. **Investigate duplicate commit**: This commit appears to duplicate work from 41400aa
   - Consider if this was intentional or a merge artifact
   - If intentional, the PR description should explain why

4. **Consider knip behavior**: If knip failures should be warnings rather than blockers:
   - Use a different approach (like CI warnings)
   - Don't use a pre-commit hook
   - Pre-commit hooks should block commits when they fail
