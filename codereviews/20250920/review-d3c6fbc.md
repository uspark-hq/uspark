# Code Review: d3c6fbc - docs: add rule against mocking globalThis.services in web tests

## Commit Summary
Documentation-only commit that expands the bad-smell.md specification with comprehensive code quality rules derived from technical debt tracking. Adds 6 new rules covering test mock cleanup, TypeScript type safety, artificial delays, hardcoded configuration, direct database operations, and timer cleanup.

## Changes Analysis
- **File Modified**: `spec/bad-smell.md` (58 additions, 2 deletions)
- **Type**: Pure documentation enhancement
- **No code changes**: Only specification updates

## Compliance Assessment

### ✅ Fully Compliant Areas
- **Mock Analysis**: Rule #7 explicitly prohibits mocking `globalThis.services` in web tests, aligning with bad-smell criteria
- **Test Coverage**: Rule #8 mandates `vi.clearAllMocks()` in beforeEach hooks for test isolation
- **Error Handling**: Rule #10 prohibits artificial delays and fake timers in tests
- **TypeScript Safety**: Rule #9 enforces zero tolerance for `any` types
- **Interface Changes**: Documents clear API testing guidelines (Rule #12)

### ✅ Addresses Key Bad Smells
- **Timer and Delay Analysis**: Rule #10 explicitly prohibits `vi.useFakeTimers()` and artificial delays
- **Database Mocking**: Rule #7 prevents mocking database services in web tests
- **Hardcoded Configuration**: Rule #11 requires centralized env() configuration
- **Direct DB Operations**: Rule #12 promotes API endpoint usage over direct database calls

### ✅ Quality Indicators
- Well-structured documentation with clear examples
- Rules derived from actual codebase issues (evidence-based)
- Specific, actionable guidelines with code examples
- Prevents regression of previously fixed technical debt

## Overall Assessment
**EXCELLENT** - This is a pure documentation commit that significantly strengthens code quality standards. All rules align perfectly with the bad-smell.md criteria and provide clear, actionable guidance for preventing technical debt. The commit demonstrates proactive quality management by codifying lessons learned from actual codebase issues.

## Key Strengths
1. **Preventive approach**: Codifies solutions to previously identified issues
2. **Evidence-based rules**: Each rule addresses real technical debt patterns
3. **Clear examples**: Provides both good and bad code examples
4. **Comprehensive coverage**: Addresses major code smell categories systematically