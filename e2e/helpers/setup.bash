#!/usr/bin/env bash

# Get the root directory of the test suite
TEST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load BATS libraries
load "${TEST_ROOT}/test/libs/bats-support/load"
load "${TEST_ROOT}/test/libs/bats-assert/load"

# Support for remote testing
export BASE_URL="${BASE_URL:-http://localhost:3000}"
export PREVIEW_URL="${PREVIEW_URL:-$BASE_URL}"
export API_URL="${API_URL:-$BASE_URL}"

# Path to the CLI with optional API URL
if [ -n "$API_URL" ] && [ "$API_URL" != "http://localhost:3000" ]; then
    export CLI_COMMAND="uspark --api-url $API_URL"
else
    export CLI_COMMAND="uspark"
fi

# Helper function to check if we're testing against a remote environment
is_remote_test() {
    [ "$BASE_URL" != "http://localhost:3000" ]
}

# Helper function to make API calls
api_call() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "${BASE_URL}${endpoint}"
    else
        curl -s -X "$method" "${BASE_URL}${endpoint}"
    fi
}