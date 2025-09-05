#!/bin/bash

echo "Starting E2E tests for CLI Token Management..."

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "Installing Playwright..."
    npx playwright install chromium
fi

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "Starting development server..."
    cd ../../turbo && pnpm dev &
    SERVER_PID=$!
    sleep 10
fi

# Run the simple test
echo "Running tests..."
npx playwright test tests/cli-token-simple.spec.ts --reporter=list

# Clean up
if [ -n "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null
fi

echo "Tests completed!"