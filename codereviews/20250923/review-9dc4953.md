# Review: test: add cli e2e tests for push and pull functionality

## Commit: 9dc4953

## Summary

This commit adds comprehensive end-to-end tests for CLI push and pull functionality using the BATS testing framework. The tests cover single file operations, multiple files with the `--all` flag, subdirectory handling, file overwriting, special character support, and empty project scenarios.

## Findings

### Good Practices

- **Comprehensive test coverage**: Tests cover multiple scenarios including edge cases like special characters in filenames and empty projects
- **Proper test isolation**: Each test uses a temporary directory with setup/teardown functions to avoid interference
- **Realistic test scenarios**: Tests mimic real-world usage patterns including file overwriting behavior
- **Clear test structure**: Well-organized test file with descriptive test names and logical grouping
- **Authentication handling**: Properly skips tests when CLI is not authenticated rather than failing

### Issues Found

1. **Minimal mock server enhancement**: The mock server changes in `/turbo/apps/cli/src/test/mock-server.ts` add global blob storage fallback, which could be a sign of test complexity creeping in. The dual storage lookup pattern might indicate over-engineering.

2. **Unnecessary comment additions**: The commit adds minimal comments like "CLI configuration and version" and "Metadata configuration for the application" that appear to be added just to trigger CI workflows, which violates the YAGNI principle.

3. **Test authentication dependency**: Tests skip when not authenticated rather than setting up proper test authentication, which could lead to flaky test runs in CI environments.

4. **Potential race conditions**: The use of timestamp-based project IDs (`test-project-$(date +%s)`) could lead to collisions in parallel test execution.

5. **Weak assertions in cleanup test**: The cleanup test in `t99-cleanup.bats` changes the authentication test to be overly permissive (`assert_success || assert_failure`) which reduces test value.

## Recommendations

1. **Simplify mock server**: Consider whether the global blob storage fallback is necessary or if it indicates test setup complexity that should be addressed differently.

2. **Remove unnecessary comments**: Remove the trivial comments added solely for CI triggering - this violates the YAGNI principle of only adding what's needed.

3. **Improve test authentication**: Set up proper test authentication rather than skipping tests, to ensure consistent CI behavior.

4. **Use more robust test IDs**: Consider using UUIDs or other collision-resistant identifiers instead of timestamps for test project IDs.

5. **Strengthen cleanup test assertions**: Make the cleanup test more specific about expected authentication state rather than accepting any outcome.

6. **Consider test parallelization**: The current setup may not work well with parallel test execution due to shared authentication state.

Overall, this is a solid addition of test coverage with good practices, but has some minor code smells around unnecessary additions and test setup complexity.