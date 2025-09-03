#!/usr/bin/env bats

load '../../helpers/setup'

@test "API health check endpoint responds" {
    if is_remote_test; then
        skip "Remote API health check not yet implemented"
    fi
    
    run api_call "/api/health"
    assert_success
}

@test "API returns proper content-type headers" {
    if is_remote_test; then
        skip "Remote API header check not yet implemented"
    fi
    
    run curl -s -I "${BASE_URL}/api/health"
    assert_success
    assert_output --partial "Content-Type:"
}

@test "API handles 404 for unknown endpoints" {
    run api_call "/api/unknown-endpoint-that-does-not-exist"
    # Check if response contains error or 404 indication
    # Note: exact check depends on your API error handling
    assert_output --partial "not found"
}

@test "Web application responds at root path" {
    run curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/"
    assert_success
    assert_output "200"
}

@test "Preview deployment has correct environment" {
    if ! is_remote_test; then
        skip "Only for remote preview deployments"
    fi
    
    # Verify the deployment is accessible
    run curl -s "${PREVIEW_URL}"
    assert_success
}