#!/usr/bin/env bats

load '../../helpers/setup'

# Setup and teardown for claude-worker tests
setup() {
    # Create a temporary test directory
    export TEST_DIR="$(mktemp -d)"
    export ORIGINAL_DIR="$(pwd)"
    cd "$TEST_DIR"

    # Create a test project ID
    export PROJECT_ID="test-worker-project-$(date +%s)"

    # Ensure we have authentication
    if ! cli_with_host auth status | grep -q "Authenticated"; then
        skip "CLI not authenticated - run auth setup first"
    fi

    # Create .uspark directory structure
    mkdir -p .uspark/tasks

    # Create a simple task file
    cat > .uspark/tasks/task-1.md << 'EOF'
# Task: Create Hello File

## Status
in_progress

## Description
Create a file called hello.txt with "Hello from Worker!"

## Progress
- [ ] Create hello.txt file
EOF

    # Push the task file to the remote project
    cd .uspark
    cli_with_host push --project-id "$PROJECT_ID"
    cd ..

    # Create fake claude command that will be used instead of real Claude
    export FAKE_CLAUDE_PATH="$TEST_DIR/fake-claude"
    cat > "$FAKE_CLAUDE_PATH" << 'FAKECLAUDE'
#!/usr/bin/env bash

# Read prompt from stdin (required for claude compatibility)
cat > /dev/null

# Output stream-json format
echo '{"type":"assistant","message":{"id":"msg_test","type":"message","role":"assistant","content":[{"type":"text","text":"Worker iteration completed"}]}}'

# Check iteration count and output sleep signal after 2 iterations
ITERATION_FILE="${ITERATION_FILE:-/tmp/worker-iteration-count}"
ITERATION=$(cat "$ITERATION_FILE" 2>/dev/null || echo 0)
ITERATION=$((ITERATION + 1))
echo "$ITERATION" > "$ITERATION_FILE"

if [ "$ITERATION" -ge 2 ]; then
    echo "###USPARK_WORKER_SLEEP###"
fi

# Output success result
echo '{"type":"result","subtype":"success","is_error":false}'
FAKECLAUDE
    chmod +x "$FAKE_CLAUDE_PATH"

    # Add fake claude to PATH
    export PATH="$TEST_DIR:$PATH"

    # Reset iteration count
    export ITERATION_FILE="$TEST_DIR/iteration-count"
    echo "0" > "$ITERATION_FILE"

    # Set max iterations to prevent infinite loop
    export MAX_ITERATIONS=2
}

teardown() {
    # Return to original directory
    cd "$ORIGINAL_DIR"

    # Clean up temporary directory
    rm -rf "$TEST_DIR"

    # Clean up iteration file
    rm -f "$ITERATION_FILE"
}

@test "CLI claude-worker executes basic loop" {
    # Run claude-worker with limited iterations (MAX_ITERATIONS=2 set in setup)
    run cli_with_host claude-worker --id 1 --project-id "$PROJECT_ID"

    # Should succeed
    assert_success

    # Verify .uspark directory exists
    assert [ -d .uspark ]

    # Verify task file was pulled
    assert [ -f .uspark/tasks/task-1.md ]
}

@test "CLI claude-worker syncs files between iterations" {
    # Create fake claude that writes a file
    cat > "$FAKE_CLAUDE_PATH" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Read prompt from stdin
cat > /dev/null

# Create a test file to verify sync
echo "Worker created this file" > worker-output.txt

# Output stream-json format
echo '{"type":"assistant","message":{"id":"msg_test","type":"message","role":"assistant","content":[{"type":"text","text":"Created worker-output.txt"}]}}'

# Output sleep signal to stop after first iteration
echo "###USPARK_WORKER_SLEEP###"

# Output success result
echo '{"type":"result","subtype":"success","is_error":false}'
FAKECLAUDE
    chmod +x "$FAKE_CLAUDE_PATH"

    # Run worker (MAX_ITERATIONS=2 set in setup)
    run cli_with_host claude-worker --id 1 --project-id "$PROJECT_ID"
    assert_success

    # Clean local directory
    rm -rf .uspark

    # Pull from remote to verify file was pushed
    mkdir -p .uspark
    cd .uspark
    run cli_with_host pull --project-id "$PROJECT_ID"
    assert_success
    cd ..

    # Verify the file created by fake claude exists in pulled content
    assert [ -f .uspark/worker-output.txt ]
    assert [ "$(cat .uspark/worker-output.txt)" = "Worker created this file" ]
}

@test "CLI claude-worker respects MAX_ITERATIONS environment variable" {
    # Set very low iteration limit
    export MAX_ITERATIONS=1

    # Run worker - should complete quickly
    run cli_with_host claude-worker --id 1 --project-id "$PROJECT_ID"

    # Should succeed and exit normally
    assert_success
}
