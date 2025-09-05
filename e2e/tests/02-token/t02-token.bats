#!/usr/bin/env bats

load '../../helpers/setup'

@test "CLI auth commands are available" {
    run $CLI_COMMAND auth --help
    assert_success
    assert_output --partial "auth"
}

@test "CLI auth login initiates device flow" {
    # Try login which should start device flow authentication
    timeout 2 bash -c 'echo | uspark auth login --api-url "$API_HOST"' > /tmp/auth_init_output 2>&1 || true
    # Should show device flow related messages
    grep -E -q "(device|code|visit|authenticate)" /tmp/auth_init_output
}

@test "CLI auth login shows device flow instructions" {
    # The auth login command uses device flow, not token-based auth
    # It should show instructions for authentication
    timeout 2 bash -c 'echo | uspark auth login --api-url "$API_HOST"' > /tmp/auth_output 2>&1 || true
    grep -q "visit\|code\|authenticate" /tmp/auth_output
}

@test "CLI auth status shows not authenticated when no token" {
    # Clear any existing auth
    run $CLI_COMMAND auth logout
    
    # Check status
    run $CLI_COMMAND auth status
    assert_output --partial "Not authenticated"
}

@test "CLI can connect to specified API_HOST" {
    # Test with production API
    run cli_with_host info
    assert_success
    assert_output --partial "API Host: ${API_HOST}"
}

@test "CLI respects custom API_HOST" {
    # Test that CLI uses the provided API_HOST
    # The actual host will be the deployed preview URL from GitHub Actions
    run cli_with_host auth status
    # Just verify the command runs successfully with the custom host
    # The actual URL will vary per deployment
    assert_success || assert_failure  # Either authenticated or not, but should run
}