#!/usr/bin/env bats

load '../../helpers/setup'

# These tests run last and can safely clear authentication
# without affecting other tests

@test "CLI auth logout clears credentials" {
    # Clear any existing auth
    run $CLI_COMMAND auth logout
    assert_success

    # Check status shows not authenticated
    run $CLI_COMMAND auth status
    assert_output --partial "Not authenticated"
}

@test "CLI auth status shows not authenticated after logout" {
    # Verify logout was effective
    run $CLI_COMMAND auth status
    assert_output --partial "Not authenticated"
}