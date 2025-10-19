# Code Review: 41b30e5

**Commit:** docs: add technical debt record for test setup dom mocking (#583)
**Author:** Ethan Zhang
**Date:** 2025-10-17 22:53:56 -0700

## Summary

Adds technical debt documentation for DOM method mocking in `apps/web/src/test/setup.ts`. Documents the current workaround (environment checks for `scrollIntoView` and `ResizeObserver` mocking) and provides recommendations for future refactoring.

## Changes

**Added Files (1 file):**
- `turbo/.uspark/tech-debt.md` (107 lines) - Technical debt documentation

**Total:** 107 lines added (documentation only)

## Code Review Analysis

### Bad Code Smell Check (All 15 Categories)

#### 1. Mock Analysis
- **Status:** ✅ EXCELLENT - This documents the mock issue rather than adding new mocks
- Documents existing global DOM mocks in `apps/web/src/test/setup.ts`:
  ```typescript
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
  }
  ```
- Recognizes this as technical debt
- Provides clear recommendations to fix

#### 2. Test Coverage
- **Status:** N/A (documentation only, but addresses test setup quality)

#### 3. Error Handling
- **Status:** N/A (documentation only)

#### 4. Interface Changes
- **Status:** N/A (documentation only)

#### 5. Timer and Delay Analysis
- **Status:** N/A (documentation only)

#### 6. Dynamic Import Analysis
- **Status:** N/A (documentation only)

#### 7. Database and Service Mocking in Web Tests
- **Status:** ✅ GOOD - Documents web test mocking issues
- The documented mocks are DOM-related, not database mocks
- Correctly identifies that these should be in individual test files

#### 8. Test Mock Cleanup
- **Status:** ✅ GOOD - Documents need for better mock management
- Recognizes that global mocks pollute all tests
- Recommends moving to individual test files with proper cleanup

#### 9. TypeScript `any` Type Usage
- **Status:** N/A (documentation only)

#### 10. Artificial Delays in Tests
- **Status:** N/A (documentation only)

#### 11. Hardcoded URLs and Configuration
- **Status:** N/A (documentation only)

#### 12. Direct Database Operations in Tests
- **Status:** N/A (documentation only)

#### 13. Avoid Fallback Patterns - Fail Fast
- **Status:** ✅ EXCELLENT - Documents environment check workarounds
- Correctly identifies `if (typeof Element !== "undefined")` as a workaround
- Explains these checks exist because setup.ts runs in both node and jsdom environments
- Recommends proper solutions instead of workarounds

#### 14. Prohibition of Lint/Type Suppressions
- **Status:** N/A (documentation only)

#### 15. Avoid Bad Tests
- **Status:** ✅ EXCELLENT - Addresses test quality issues
- Documents global mock pollution (bad test practice)
- Recommends mocking in individual test files (good test practice)
- Recognizes test isolation issues

### ✅ Strengths

1. **Excellent Technical Debt Recognition**
   - Honestly documents workarounds introduced in PR #580
   - Explains why current approach is technical debt
   - Provides context for why the workaround was added (quick fix to unblock CI)
   - Acknowledges trade-off: "quick fix to unblock CI" vs "proper test architecture"

2. **Clear Problem Statement**
   - Lists 4 specific issues with current implementation:
     1. Global mocks pollute all tests
     2. jsdom should provide these APIs
     3. Environment checks are workarounds
     4. Mixing concerns (DOM mocking in global setup)
   - Explains current impact (low risk but maintenance burden)

3. **Actionable Recommendations**
   - **Option 1: Upgrade jsdom** (marked as recommended)
     - Check if latest jsdom provides these APIs natively
     - Remove mocks if jsdom supports them
   - **Option 2: Mock in Individual Test Files**
     - Provides code example
     - Shows proper cleanup with `afterEach`
   - **Option 3: Separate Setup Files by Environment**
     - `setup.node.ts` for node tests
     - `setup.jsdom.ts` for jsdom tests

4. **Good Documentation Structure**
   - Created: 2025-10-18
   - Priority: Medium
   - Category: Testing Infrastructure
   - Includes references to original fix (PR #580)
   - Lists action items as checkboxes

5. **Honest Assessment**
   - "Current implementation works but represents a compromise"
   - "This should be addressed during the next testing infrastructure refactor"
   - Not trying to hide the debt, but clearly documenting it

### 💡 Observations

1. **Background Context**
   - Workaround was added in PR #580 to fix "ReferenceError: Element is not defined"
   - Quick fix to unblock CI (appropriate at the time)
   - Now documenting as technical debt for future refactor

2. **Documented Mocks**
   ```typescript
   // Polyfill scrollIntoView for jsdom
   if (typeof Element !== "undefined") {
     Element.prototype.scrollIntoView = vi.fn();
   }

   // Polyfill ResizeObserver for jsdom
   if (typeof ResizeObserver === "undefined") {
     global.ResizeObserver = class ResizeObserver {
       observe() {}
       unobserve() {}
       disconnect() {}
     };
   }
   ```

3. **Why This Is Technical Debt**
   - Required by cmdk component for keyboard navigation and resize handling
   - Modern jsdom should implement standard DOM APIs
   - Global setup applies to ALL tests, even those that don't need it
   - Environment checks are defensive programming (anti-pattern per project principles)

4. **Action Items Provided**
   - Check current jsdom version and changelog
   - If jsdom supports these APIs, remove mocks
   - If not, move mocks to individual test files
   - Document decision in ADR (Architecture Decision Record)

### ⚠️ No Concerns

This is excellent technical debt documentation. It honestly acknowledges a workaround, explains why it was needed, and provides clear recommendations for proper resolution. The documentation itself introduces no new issues.

## Verdict

✅ **APPROVED** - Exemplary technical debt documentation that honestly documents a testing workaround and provides clear, actionable recommendations for proper resolution. This is exactly how technical debt should be tracked.

**Highlights:**
- Honest acknowledgment of workaround (not hiding debt)
- Clear problem statement with 4 specific issues
- 3 concrete solution options with code examples
- Proper categorization (Priority: Medium, Category: Testing Infrastructure)
- Acknowledges trade-off: quick fix vs proper architecture
- Action items provided as checklist
- References original context (PR #580)
- Documentation-only change (low risk, high value)

**This is a model example of how to document technical debt - acknowledge it, explain it, and provide a path to fix it.**
