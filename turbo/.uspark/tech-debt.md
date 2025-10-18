# Technical Debt

## Test Setup: DOM Method Mocking

**Created**: 2025-10-18
**Priority**: Medium
**Category**: Testing Infrastructure

### Problem

Currently, `apps/web/src/test/setup.ts` mocks DOM methods globally with environment checks:

```typescript
// Polyfill scrollIntoView for jsdom
// Required by cmdk component for keyboard navigation
// Only available in jsdom environment, not in node environment
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}

// Polyfill ResizeObserver for jsdom
// Required by cmdk component used in Command/ComboBox
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
```

### Why This Is Technical Debt

1. **Global mocks pollute all tests**: These mocks apply to ALL tests that use this setup file, even those that don't need them

2. **jsdom should provide these APIs**: Modern jsdom versions should implement standard DOM APIs like `scrollIntoView` and `ResizeObserver`

3. **Environment checks are a workaround**: The `if (typeof Element !== "undefined")` check exists only because setup.ts runs in both node and jsdom environments

4. **Mixing concerns**: DOM mocking should be in individual test files that need it, not in global setup

### Current Impact

- **Low risk**: The workaround functions correctly
- **Maintenance burden**: Future developers might add more global mocks instead of fixing the root cause
- **Test isolation**: Tests don't clearly declare their dependencies

### Recommended Solution

#### Option 1: Upgrade jsdom (Recommended)

```bash
# Check current jsdom version
pnpm list jsdom

# Upgrade to latest version that implements these APIs
pnpm add -D jsdom@latest
```

Then remove the mocks from setup.ts if jsdom provides them.

#### Option 2: Mock in Individual Test Files

Move mocks to the specific test files that need them:

```typescript
// In app/components/claude-chat/__tests__/chat-interface.test.tsx
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

#### Option 3: Separate Setup Files by Environment

Create separate setup files:

- `setup.node.ts` - For node environment tests
- `setup.jsdom.ts` - For jsdom environment tests

Update vitest.config.ts to use appropriate setup file per environment.

### References

- Original fix: PR #580
- Related file: `apps/web/src/test/setup.ts`
- jsdom documentation: https://github.com/jsdom/jsdom
- Vitest setup docs: https://vitest.dev/config/#setupfiles

### Action Items

- [ ] Check current jsdom version and changelog for scrollIntoView/ResizeObserver support
- [ ] If jsdom supports these APIs, remove mocks from setup.ts
- [ ] If not, consider moving mocks to individual test files
- [ ] Document decision in ADR (Architecture Decision Record)

### Notes

The current implementation works but represents a compromise between:

- Quick fix to unblock CI (what we did)
- Proper test architecture (what we should do)

This should be addressed during the next testing infrastructure refactor.
