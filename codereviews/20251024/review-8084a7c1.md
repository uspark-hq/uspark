# Code Review: 8084a7c1

**Commit:** fix: remove eslint suppressions and fix knip pre-commit hook (#741)
**Author:** Ethan Zhang <ethan@uspark.ai>
**Date:** Fri Oct 24 17:10:56 2025 -0700

## Summary

Removed all ESLint suppressions from test files and fixed knip pre-commit hook to properly enforce code quality checks.

## Changes Analysis

- `turbo/apps/workspace/src/views/project/__tests__/block-display.test.tsx` - Removed suppressions, improved tests (-54 lines, +54 lines)
- `turbo/lefthook.yml` - Fixed knip hook to enforce quality (-1 line, +1 line)
- Updated code review documentation to reflect fixes

## Review Against Bad Code Smells

### ✅ 14. Prohibition of Lint/Type Suppressions
**Status: EXCELLENT** ⭐

**This commit directly addresses Bad Code Smell #14.**

From the specification:
> **ZERO tolerance for suppression comments** - fix the issue, don't hide it

**Before (violates spec):**
```typescript
// eslint-disable testing-library/no-container
// eslint-disable testing-library/no-node-access
const h1 = container.querySelector('h1');
```

**After (complies with spec):**
```typescript
const h1 = screen.getByRole('heading', { level: 1 });
```

**Changes made:**
1. Replaced `container.querySelector('h1')` with `screen.getByRole('heading')`
2. Replaced `container.querySelector('ul')` with `screen.getByRole('list')`
3. Replaced `container.querySelectorAll('li')` with `screen.getAllByRole('listitem')`
4. Removed CSS class testing (implementation detail)
5. Improved XSS test to actually test dangerous content

**Result:** Zero ESLint suppressions, all 22 tests passing

### ✅ 15. Avoid Bad Tests
**Status: EXCELLENT**

**Improvements to test quality:**

**Before (testing implementation details):**
```typescript
it("should have correct CSS classes", () => {
  expect(button).toHaveClass("btn-primary");
});
```

**After (testing behavior):**
Uses testing-library queries that focus on what users see/do, not implementation

### Pre-commit Hook Fix ✅

**Before (broken enforcement):**
```yaml
run: pnpm knip --cache --no-exit-code  # Never blocks commits!
```

**After (proper enforcement):**
```yaml
run: pnpm knip --cache  # Blocks commits when issues found
```

**Impact:**
- Previously: Knip warnings ignored, unused code could be committed
- Now: Commits blocked when unused code detected
- Enforces code quality at commit time

## Final Assessment

### Strengths
✅ **Perfect adherence to zero-suppression policy**
✅ **Fixes root cause instead of hiding it**
✅ **Improves test quality (testing-library best practices)**
✅ **Restores knip enforcement in pre-commit**
✅ **All 22 tests continue to pass**
✅ **Removes implementation detail testing**
✅ **Clear commit message explaining motivation**

### Impact Analysis

**Before:**
- ⚠️ ESLint violations suppressed instead of fixed
- ⚠️ Tests using anti-patterns (direct DOM queries)
- ⚠️ Knip never blocks commits (`--no-exit-code`)
- ⚠️ Code quality tools undermined

**After:**
- ✅ Zero suppressions across codebase
- ✅ Tests follow testing-library best practices
- ✅ Knip properly enforces quality
- ✅ Pre-commit hooks actually protect quality

### Technical Debt Resolution

Updated code review documentation to reflect these fixes, demonstrating proper feedback loop from code review to implementation.

## Verdict

**APPROVED ✅**

This is **exemplary work** that demonstrates:
- Zero-tolerance enforcement of suppression policy
- Fixing root causes instead of hiding warnings
- Improving test quality while fixing violations
- Restoring broken pre-commit enforcement
- Following up on code review feedback

**This commit should be used as a reference for:**
- How to remove ESLint suppressions properly
- Using testing-library best practices
- Configuring pre-commit hooks correctly
- Responding to code review feedback

---

## Code Quality Score: 100/100

Breakdown:
- Suppression Removal: 100/100 (zero suppressions achieved)
- Test Quality: 100/100 (proper testing-library usage)
- Tool Configuration: 100/100 (knip now enforces properly)
- Process: 100/100 (proper feedback loop from review)
