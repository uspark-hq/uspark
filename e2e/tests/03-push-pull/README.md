# Push-Pull E2E Tests

These tests verify the CLI's file synchronization functionality (push and pull commands).

## Important Note

These tests require CLI authentication to run. They will be skipped if:
1. The CLI is not authenticated
2. Previous tests (like `02-token`) have logged out

In CI, authentication is done once at the beginning, but test `02-token/t02-token.bats`
includes a logout test that clears the authentication. This causes push-pull tests to be skipped.

## Potential Solutions

1. **Re-authenticate in setup** - Add authentication logic in the setup function
2. **Run push-pull tests before token tests** - Rename to `02-push-pull` and `03-token`
3. **Isolate logout test** - Move the logout test to a separate file that runs last
4. **Save and restore auth** - Save auth state before logout test and restore after

## Test Coverage

- Single file push and pull
- Multiple files with `--all` flag
- Files in subdirectories
- File overwriting behavior
- Special characters in filenames
- Empty project handling

## Running Locally

```bash
# Ensure you're authenticated first
API_HOST=http://localhost:3000 uspark auth login

# Run the tests
cd e2e
API_HOST=http://localhost:3000 ./test/libs/bats/bin/bats tests/03-push-pull/*.bats
```