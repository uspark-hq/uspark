# E2E Test Suite

End-to-end tests using BATS (Bash Automated Testing System).

## Structure

```
e2e/
├── .bats/                # BATS installation (git-ignored)
├── fixtures/             # Test data and expected outputs
│   ├── configs/         # Configuration files for testing
│   ├── inputs/          # Input data files
│   └── expected/        # Expected output snapshots
├── helpers/             # Shared test helpers
│   └── setup.bash       # Common setup/teardown functions
├── tests/               # Test suites
│   ├── 01-basic/       # Basic functionality tests
│   ├── 02-commands/    # Command-specific tests
│   ├── 03-pipes/       # Pipe and stdin tests
│   ├── 04-errors/      # Error handling tests
│   └── 05-integration/ # Integration tests
├── Makefile            # Test runner with make targets
└── run.sh              # Direct test runner script
```

## Quick Start

### Using Make (Recommended)

```bash
# Run all tests
make test

# Run specific test suites
make test-basic     # Basic functionality
make test-errors    # Error handling
make test-pipes     # Pipe/stdin tests

# Run with verbose output
make test-verbose

# Run with TAP output (for CI)
make test-tap
```

### Using run.sh

```bash
# Run all tests
./run.sh

# Run specific test file
./run.sh tests/01-basic/t0100-help.bats

# Run tests matching pattern
./run.sh tests/01-basic/*.bats
```

### Direct BATS Usage

```bash
# After installation
.bats/bats-core/bin/bats tests/**/*.bats
```

## Writing Tests

### Basic Test Structure

```bash
#!/usr/bin/env bats

load '../../helpers/setup'

@test "description of test" {
    run $CLI_COMMAND command args
    assert_success
    assert_output --partial "expected output"
}
```

### Available Assertions

From `bats-assert`:
- `assert_success` / `assert_failure [status]`
- `assert_output [--partial] "text"`
- `refute_output [--partial] "text"`
- `assert_line [--index N] "text"`
- `refute_line [--index N] "text"`

### Test Naming Convention

Following Git's convention:
- `t0100-t0199`: Basic functionality (help, version, etc.)
- `t0200-t0299`: Command tests
- `t0300-t0399`: Input/output tests
- `t0400-t0499`: Error handling
- `t0500-t0599`: Integration tests

## CI Integration

The test suite is integrated with GitHub Actions. Tests run on:
- Ubuntu (latest)
- macOS (latest)
- Windows (with Git Bash)

TAP output is used for CI reporting:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    make test-tap
```

## Dependencies

- BATS Core
- bats-support
- bats-assert
- Built CLI (`pnpm build --filter makita-cli`)

## Troubleshooting

### Tests Failing to Find CLI Command

Ensure the CLI is built and linked:
```bash
cd turbo
pnpm build --filter makita-cli
cd packages/cli
pnpm link --global
```

### Permission Denied

Make scripts executable:
```bash
chmod +x run.sh
chmod +x tests/**/*.bats
```

## Contributing

1. Add tests for new features in appropriate category
2. Use descriptive test names
3. Include both success and failure cases
4. Test edge cases and error conditions
5. Keep tests isolated and independent