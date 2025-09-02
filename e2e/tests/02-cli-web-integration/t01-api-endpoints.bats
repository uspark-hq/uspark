#!/usr/bin/env bats

load '../../helpers/setup'

# Test web server API endpoints that CLI will interact with
# These tests validate the server-side functionality before CLI integration

setup() {
    # Set base URL for API tests
    export API_BASE_URL="http://localhost:3000"
    
    # Skip if server is not running
    if ! curl -sf "$API_BASE_URL/api/hello" >/dev/null 2>&1; then
        skip "Web server not running at $API_BASE_URL"
    fi
}

@test "Device code generation endpoint responds correctly" {
    # Test POST /api/cli/auth/device
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device"
    
    assert_success
    
    # Validate response contains required fields
    echo "$output" | jq -e '.device_code'
    echo "$output" | jq -e '.user_code'
    echo "$output" | jq -e '.verification_url'
    echo "$output" | jq -e '.expires_in'
    echo "$output" | jq -e '.interval'
    
    # Validate device code format (XXXX-XXXX)
    device_code=$(echo "$output" | jq -r '.device_code')
    [[ "$device_code" =~ ^[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]
}

@test "Token exchange with invalid device code returns error" {
    # Test POST /api/cli/auth/token with invalid code
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"device_code": "INVALID-CODE"}' \
        "$API_BASE_URL/api/cli/auth/token"
    
    assert_success
    
    # Should return error response
    echo "$output" | jq -e '.error'
    echo "$output" | jq -e '.error_description'
    
    # Check for specific error type
    error_type=$(echo "$output" | jq -r '.error')
    [[ "$error_type" == "invalid_request" ]]
}

@test "Token exchange with pending device code returns pending status" {
    # First generate a device code
    device_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    device_code=$(echo "$device_response" | jq -r '.device_code')
    
    # Test token exchange immediately (should be pending)
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"device_code\": \"$device_code\"}" \
        "$API_BASE_URL/api/cli/auth/token"
    
    assert_success
    
    # Should return pending status
    error_type=$(echo "$output" | jq -r '.error')
    [[ "$error_type" == "authorization_pending" ]]
}

@test "Generate token endpoint requires authentication" {
    # Test POST /api/cli/auth/generate-token without auth
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"name": "test-token", "expires_in_days": 30}' \
        "$API_BASE_URL/api/cli/auth/generate-token"
    
    assert_success
    
    # Should return unauthorized error
    error_type=$(echo "$output" | jq -r '.error')
    [[ "$error_type" == "unauthorized" ]]
}

@test "Hello API endpoint works correctly" {
    # Test basic hello endpoint (used as connectivity check)
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"name": "test"}' \
        "$API_BASE_URL/api/hello"
    
    assert_success
    
    # Validate response structure
    echo "$output" | jq -e '.message'
    echo "$output" | jq -e '.timestamp'
    
    # Check message content
    message=$(echo "$output" | jq -r '.message')
    [[ "$message" == *"Hello, test!"* ]]
}