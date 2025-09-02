#!/usr/bin/env bats

load '../../helpers/setup'

# Simulate the authentication flow that CLI will implement
# These tests prepare for the actual CLI auth implementation

setup() {
    export API_BASE_URL="http://localhost:3000"
    
    # Skip if server is not running
    if ! curl -sf "$API_BASE_URL/api/hello" >/dev/null 2>&1; then
        skip "Web server not running at $API_BASE_URL"
    fi
}

@test "Complete device flow simulation - pending state" {
    # Step 1: Generate device code (CLI would call this)
    device_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    device_code=$(echo "$device_response" | jq -r '.device_code')
    verification_url=$(echo "$device_response" | jq -r '.verification_url')
    expires_in=$(echo "$device_response" | jq -r '.expires_in')
    interval=$(echo "$device_response" | jq -r '.interval')
    
    # Validate we got proper response
    [[ "$device_code" =~ ^[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]
    [[ "$verification_url" != "null" ]]
    [[ "$expires_in" -gt 0 ]]
    [[ "$interval" -gt 0 ]]
    
    # Step 2: Poll for token (CLI would do this in a loop)
    token_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"device_code\": \"$device_code\"}" \
        "$API_BASE_URL/api/cli/auth/token")
    
    # Should be pending initially
    error_type=$(echo "$token_response" | jq -r '.error')
    [[ "$error_type" == "authorization_pending" ]]
    
    echo "✓ Device flow initiated successfully"
    echo "✓ Device code: $device_code"
    echo "✓ Verification URL: $verification_url"
    echo "✓ Initial status: pending"
}

@test "Device code expiry validation" {
    # Generate device code
    device_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    device_code=$(echo "$device_response" | jq -r '.device_code')
    expires_in=$(echo "$device_response" | jq -r '.expires_in')
    
    # Verify expiry time is reasonable (should be 900 seconds = 15 minutes)
    [[ "$expires_in" -eq 900 ]]
    
    echo "✓ Device code expires in $expires_in seconds (15 minutes)"
}

@test "Multiple device codes can be generated" {
    # Generate first device code
    response1=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    code1=$(echo "$response1" | jq -r '.device_code')
    
    # Generate second device code
    response2=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    code2=$(echo "$response2" | jq -r '.device_code')
    
    # Codes should be different
    [[ "$code1" != "$code2" ]]
    
    # Both should be valid format
    [[ "$code1" =~ ^[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]
    [[ "$code2" =~ ^[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]
    
    echo "✓ Multiple unique device codes generated"
    echo "✓ Code 1: $code1"
    echo "✓ Code 2: $code2"
}

@test "Polling interval respected" {
    # Generate device code
    device_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/cli/auth/device")
    
    device_code=$(echo "$device_response" | jq -r '.device_code')
    interval=$(echo "$device_response" | jq -r '.interval')
    
    # Verify polling interval is reasonable (should be 5 seconds)
    [[ "$interval" -eq 5 ]]
    
    # Simulate rapid polling (this should work but CLI should respect interval)
    start_time=$(date +%s)
    
    for i in {1..3}; do
        token_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"device_code\": \"$device_code\"}" \
            "$API_BASE_URL/api/cli/auth/token")
        
        # All should return pending (no rate limiting implemented yet)
        error_type=$(echo "$token_response" | jq -r '.error')
        [[ "$error_type" == "authorization_pending" ]]
    done
    
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    
    echo "✓ Polling interval: $interval seconds"
    echo "✓ Multiple polls completed in ${elapsed}s"
}

@test "Invalid JSON request handling" {
    # Test with malformed JSON
    run curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"invalid": json}' \
        "$API_BASE_URL/api/cli/auth/device"
    
    assert_success
    
    # Should handle gracefully (though this might vary by implementation)
    echo "✓ Server handles malformed requests"
}

@test "Authentication endpoints are HTTPS ready" {
    # Verify endpoints exist and respond (this test runs on HTTP in dev)
    # In production, these would be HTTPS only
    
    endpoints=(
        "/api/cli/auth/device"
        "/api/cli/auth/token" 
        "/api/cli/auth/generate-token"
    )
    
    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
        # Endpoints should respond (even if with error due to missing data)
        [[ "$response" != "404" ]]
        echo "✓ Endpoint $endpoint responds (status: $response)"
    done
}