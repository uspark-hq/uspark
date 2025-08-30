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
echo -e "${YELLOW}Building makita-cli...${NC}"
(cd "$SCRIPT_DIR/../turbo" && pnpm build --filter makita-cli)

# Ensure CLI is available globally
echo -e "${YELLOW}Linking CLI globally...${NC}"
(cd "$SCRIPT_DIR/../turbo/apps/cli" && pnpm link --global)

# Run tests
echo -e "${GREEN}Running BATS tests...${NC}"

# Default: run all tests
if [[ $# -eq 0 ]]; then
    "$BATS_BIN" "$SCRIPT_DIR"/tests/**/*.bats
else
    # Run specific tests passed as arguments
    "$BATS_BIN" "$@"
fi