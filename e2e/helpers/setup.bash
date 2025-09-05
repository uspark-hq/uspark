#!/usr/bin/env bash

# Get the root directory of the test suite
TEST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load BATS libraries
load "${TEST_ROOT}/test/libs/bats-support/load"
load "${TEST_ROOT}/test/libs/bats-assert/load"

# Path to the CLI
export CLI_COMMAND="uspark"

# API Host configuration (can be overridden via environment variable)
export API_HOST="${API_HOST:-https://app.uspark.ai}"

# Helper function to run CLI with API host
cli_with_host() {
    USPARK_API_HOST="$API_HOST" $CLI_COMMAND "$@"
}