# Bad Code Smells

This document defines code quality issues and anti-patterns to identify during code reviews.

## 1. Mock Analysis
- Identify new mock implementations
- Suggest non-mock alternatives where possible
- List all new mocks for user review
- Flag fetch API mocking in tests (should use MSW for network mocking instead)

## 2. Test Coverage
- Evaluate test quality and completeness
- Check for missing test scenarios
- Assess test maintainability

## 3. Error Handling
- Identify unnecessary try/catch blocks
- Suggest fail-fast improvements
- Flag over-engineered error handling

## 4. Interface Changes
- Document new/modified public interfaces
- Highlight breaking changes
- Review API design decisions

## 5. Timer and Delay Analysis
- Identify artificial delays and timers in production code
- Check for advancedTimer or fakeTimer usage in tests
- Flag timeout increases to pass tests
- Suggest deterministic alternatives to time-based solutions

## 6. Dynamic Import Analysis
- Identify dynamic `import()` calls that could be static imports
- Convert runtime dynamic imports to static imports at file top
- Preserve type-only imports (JSDoc/TypeScript annotations)
- Flag unnecessary async operations from dynamic imports