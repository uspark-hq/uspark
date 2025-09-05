#!/usr/bin/env bash

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BATS_BIN="$SCRIPT_DIR/test/libs/bats/bin/bats"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if BATS is installed
if [[ ! -f "$BATS_BIN" ]]; then
    echo -e "${RED}Error: BATS is not installed${NC}"
    echo "Initializing git submodules..."
    git submodule update --init --recursive
    if [[ ! -f "$BATS_BIN" ]]; then
        echo -e "${RED}Failed to initialize BATS submodules${NC}"
        exit 1
    fi
fi

# Build the CLI before testing
echo -e "${YELLOW}Building @uspark/cli...${NC}"
(cd "$SCRIPT_DIR/../turbo" && pnpm build --filter @uspark/cli)

# Ensure CLI is available globally
echo -e "${YELLOW}Linking CLI globally...${NC}"
(cd "$SCRIPT_DIR/../turbo/apps/cli" && pnpm link --global)

# API Host configuration
if [[ -n "$API_HOST" ]]; then
    echo -e "${YELLOW}Using API_HOST: ${API_HOST}${NC}"
    export API_HOST
else
    echo -e "${YELLOW}Using default API_HOST: https://app.uspark.ai${NC}"
    export API_HOST="https://app.uspark.ai"
fi

# Run BATS tests
echo -e "${GREEN}Running BATS tests...${NC}"

# Default: run all tests
if [[ $# -eq 0 ]]; then
    "$BATS_BIN" "$SCRIPT_DIR"/tests/**/*.bats
    BATS_EXIT_CODE=$?
    
    # Run Playwright tests if API_HOST is provided (in CI/CD)
    if [[ -n "$API_HOST" ]] && [[ -d "$SCRIPT_DIR/web" ]]; then
        echo -e "${GREEN}Running Playwright E2E tests...${NC}"
        
        # Install Playwright dependencies
        echo -e "${YELLOW}Installing Playwright dependencies...${NC}"
        (cd "$SCRIPT_DIR/web" && npm ci && npx playwright install chromium)
        
        # Run Playwright tests against the deployed URL
        echo -e "${YELLOW}Testing against deployed app: ${API_HOST}${NC}"
        (cd "$SCRIPT_DIR/web" && BASE_URL="$API_HOST" npx playwright test --reporter=list)
        PLAYWRIGHT_EXIT_CODE=$?
        
        # Exit with failure if either test suite failed
        if [[ $BATS_EXIT_CODE -ne 0 ]] || [[ $PLAYWRIGHT_EXIT_CODE -ne 0 ]]; then
            exit 1
        fi
    else
        exit $BATS_EXIT_CODE
    fi
else
    # Run specific BATS tests passed as arguments
    "$BATS_BIN" "$@"
fi