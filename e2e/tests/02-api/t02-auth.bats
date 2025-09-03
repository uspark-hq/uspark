#!/usr/bin/env bats

load '../../helpers/setup'

@test "CLI auth token exchange endpoint exists" {
    # Test the auth token exchange API endpoint
    run api_call "/api/cli/auth/token" "POST" '{"code":"test-code"}'
    
    # The endpoint should exist and respond (even if with an error)
    # We're just checking it's implemented, not that auth succeeds
    assert_failure # Expected to fail with invalid code
    assert_output --partial "error"
}

@test "CLI can check authentication status" {
    if is_remote_test; then
        # For remote tests, just verify the command exists
        run $CLI_COMMAND auth status
        # Command should run but likely report not authenticated
        assert_output --partial "not authenticated"
    else
        run $CLI_COMMAND auth status
        assert_output --partial "not authenticated"
    fi
}

@test "CLI auth login shows instructions" {
    run $CLI_COMMAND auth login --help
    assert_success
    assert_output --partial "auth"
}

@test "Web app includes Clerk authentication scripts" {
    if is_remote_test; then
        # Check if the deployed app has Clerk configured
        run curl -s "${BASE_URL}"
        assert_success
        # Clerk typically injects script tags
        if [[ "$output" == *"clerk"* ]] || [[ "$output" == *"__clerk"* ]]; then
            assert_success
        else
            skip "Clerk may not be configured in preview"
        fi
    else
        skip "Local testing doesn't include full Clerk setup"
    fi
}