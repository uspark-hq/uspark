#!/usr/bin/env bats

load '../../helpers/setup'

@test "CLI auth commands are available" {
    run $CLI_COMMAND auth --help
    assert_success
    assert_output --partial "auth"
}

@test "CLI auth login requires token or prompts for it" {
    # Try login without token (should fail or prompt)
    run $CLI_COMMAND auth login <<< ""
    # Should either fail or show prompt message
    assert_output --partial "token"
}

@test "CLI auth login with invalid token fails" {
    run cli_with_host auth login --token "invalid_token_123"
    assert_failure
    assert_output --partial "Invalid token"
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

@test "CLI auth login with custom API_HOST" {
    # Test with different hosts
    API_HOST="https://app.uspark.ai" run cli_with_host auth status
    assert_output --partial "app.uspark.ai"
    
    API_HOST="http://localhost:3000" run cli_with_host auth status  
    assert_output --partial "localhost:3000"
}