# Code Review - b39a214

**Commit:** b39a2145eb7985012e2cd555db714406326c94f6
**Title:** feat(workspace): add markdown rendering for chat turn blocks
**PR:** #729

## Summary
Adds markdown HTML rendering support for text/content blocks in chat turns. Processes turn blocks to convert markdown to HTML using the marked library, displays rendered HTML with DOMPurify sanitization, and includes comprehensive security tests.

## Changes
- `turbo/apps/workspace/src/signals/project/project.ts` - Added markdown processing logic
- `turbo/apps/workspace/src/views/project/block-display.tsx` - Updated to render HTML when available
- `turbo/apps/workspace/src/views/project/markdown-preview.tsx` - Removed unnecessary type annotations
- `turbo/apps/workspace/src/signals/project/__tests__/markdown-security.test.ts` - NEW: Security tests for sanitization
- `turbo/apps/workspace/src/views/project/__tests__/block-display.test.tsx` - Added tests for HTML rendering
- `turbo/knip.json` - Added fumadocs-mdx to ignored binaries

## Code Review Findings

### 1. Mock Analysis
✅ No issues found - No new mocks introduced in implementation

### 2. Test Coverage
✅ Excellent - Comprehensive test coverage added:
- Security tests for XSS protection (198 lines)
- Component tests for HTML rendering
- Tests for backward compatibility
- Edge case tests (empty content, malformed HTML, long content)

### 3. Error Handling
✅ No issues found - Graceful handling with fallback to plain text when HTML not available

### 4. Interface Changes
✅ Good - Backward compatible:
- Checks for `html` field presence before rendering
- Falls back to plain text display if HTML not available
- No breaking changes to block structure

### 5. Timer and Delay Analysis
✅ No issues found - No timers or delays used

### 6. Dynamic Imports
✅ No issues found - Static imports only:
- `import DOMPurify from 'dompurify'`
- `import { marked } from 'marked'`

### 7. Database/Service Mocking
✅ No issues found - No database mocking

### 8. Test Mock Cleanup
✅ Good - Tests use `setupMock()` and `testContext()` properly

### 9. TypeScript `any` Usage
✅ No issues found - Proper typing throughout:
- `unknown` used for potentially unknown content
- Type narrowing with type guards
- Explicit type definitions for blocks

### 10. Artificial Delays in Tests
✅ No issues found - No artificial delays in tests

### 11. Hardcoded URLs
✅ No issues found - No hardcoded URLs

### 12. Direct Database Operations in Tests
✅ Good - Tests use API patterns via `setupProjectPage()` helper

### 13. Fallback Patterns
✅ Appropriate - Fallback to plain text is correct here:
- Not hiding errors - this is graceful degradation
- Backward compatibility requirement
- Fail-safe behavior for missing HTML field

### 14. Lint/Type Suppressions
⚠️ **Issues Found**: Multiple ESLint suppressions in tests:
- Line 50: `// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access`
- Line 72: Same suppressions repeated multiple times (lines 72, 80, 100, 124)

**Violation**: Project has zero tolerance for suppression comments. These rules are disabled to query DOM directly which suggests the tests may be testing implementation details.

### 15. Bad Tests
⚠️ **Potential Issues**:
1. **Testing implementation details**: Tests use `container.querySelector()` to check for specific HTML elements (h1, ul, li, svg)
   - This is testing the HTML structure rather than user-visible behavior
   - Example: Checking for `<h1>` tag instead of checking what users see
2. **However**: For HTML sanitization, verifying the HTML structure is actually necessary
   - Need to confirm dangerous scripts are removed
   - Need to verify safe elements are preserved
3. **Mixed bag**: Some tests are appropriate for security validation, others could be improved

## Overall Assessment
**Quality Rating:** Good with concerns about suppressions

The feature is well-implemented with comprehensive security testing. The use of DOMPurify for sanitization is correct and the security tests are thorough. However, the commit violates the project's zero-tolerance policy on lint suppressions.

**Key Concerns:**
1. ESLint suppressions violate project policy
2. Tests access DOM directly which may indicate testing implementation details

**Strengths:**
1. Comprehensive XSS security tests
2. Proper sanitization with DOMPurify
3. Backward compatibility maintained
4. Good use of TypeScript types

## Recommendations

1. **CRITICAL: Remove all ESLint suppressions**
   - Refactor tests to use testing-library queries instead of `container.querySelector`
   - Use `screen.getByRole()` and other user-centric queries
   - Example refactor:
     ```typescript
     // Instead of:
     const heading = container.querySelector('h1')

     // Use:
     expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading')
     ```

2. **Consider separating security tests from component tests**
   - Security tests (markdown-security.test.ts) are appropriate and should remain
   - Component tests (block-display.test.tsx) should focus on user behavior
   - The HTML rendering tests could use `getByRole` instead of `querySelector`

3. **Example of better test approach**:
   ```typescript
   // Instead of checking for <ul> and <li> tags:
   it('renders markdown list as HTML', () => {
     render(<BlockDisplay block={block} />)
     expect(screen.getByRole('list')).toBeInTheDocument()
     expect(screen.getAllByRole('listitem')).toHaveLength(2)
   })
   ```

4. **Security tests are fine as-is**
   - The markdown-security.test.ts file appropriately tests HTML structure
   - Sanitization testing requires checking actual HTML output
   - These tests serve a different purpose than component tests
