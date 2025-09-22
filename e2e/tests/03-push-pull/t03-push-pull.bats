#!/usr/bin/env bats

load '../../helpers/setup'

# Setup and teardown for push-pull tests
setup() {
    # Create a temporary test directory
    export TEST_DIR="$(mktemp -d)"
    export ORIGINAL_DIR="$(pwd)"
    cd "$TEST_DIR"

    # Create a test project ID
    export PROJECT_ID="test-project-$(date +%s)"

    # Ensure we have authentication
    if ! $CLI_COMMAND auth status | grep -q "Authenticated"; then
        skip "CLI not authenticated - run auth setup first"
    fi
}

teardown() {
    # Return to original directory
    cd "$ORIGINAL_DIR"

    # Clean up temporary directory
    rm -rf "$TEST_DIR"
}

@test "CLI push and pull single file" {
    # Create a test file
    echo "foo" > foo.md

    # Push the file
    run cli_with_host push foo.md --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pushed"

    # Delete the local file
    rm foo.md
    assert [ ! -f foo.md ]

    # Pull the file back
    run cli_with_host pull foo.md --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pulled"

    # Verify the file exists and has correct content
    assert [ -f foo.md ]
    assert [ "$(cat foo.md)" = "foo" ]
}

@test "CLI push --all and pull --all with multiple files" {
    # Create test files
    echo "foo" > foo.md
    echo "bar" > bar.md

    # Push all files
    run cli_with_host push --all --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pushed 2 files"

    # Delete local files
    rm foo.md bar.md
    assert [ ! -f foo.md ]
    assert [ ! -f bar.md ]

    # Pull all files back
    run cli_with_host pull --all --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pulled"

    # Verify files exist with correct content
    assert [ -f foo.md ]
    assert [ -f bar.md ]
    assert [ "$(cat foo.md)" = "foo" ]
    assert [ "$(cat bar.md)" = "bar" ]
}

@test "CLI push and pull files with subdirectories" {
    # Create directory structure
    mkdir -p docs/guides
    mkdir -p src

    echo "# README" > README.md
    echo "## Guide" > docs/guides/intro.md
    echo "// Code" > src/index.js

    # Push all files
    run cli_with_host push --all --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pushed 3 files"

    # Delete all files and directories
    rm -rf README.md docs src

    # Pull all files back
    run cli_with_host pull --all --project-id "$PROJECT_ID"
    assert_success

    # Verify directory structure and content
    assert [ -f README.md ]
    assert [ -f docs/guides/intro.md ]
    assert [ -f src/index.js ]
    assert [ "$(cat README.md)" = "# README" ]
    assert [ "$(cat docs/guides/intro.md)" = "## Guide" ]
    assert [ "$(cat src/index.js)" = "// Code" ]
}

@test "CLI pull overwrites existing file" {
    # Create initial file
    echo "original" > test.md

    # Push the file
    run cli_with_host push test.md --project-id "$PROJECT_ID"
    assert_success

    # Modify local file
    echo "modified locally" > test.md
    assert [ "$(cat test.md)" = "modified locally" ]

    # Pull should overwrite with remote version
    run cli_with_host pull test.md --project-id "$PROJECT_ID"
    assert_success

    # Verify it was overwritten
    assert [ "$(cat test.md)" = "original" ]
}

@test "CLI handles files with special characters in names" {
    # Create file with spaces and special characters
    echo "content" > "my file (1).md"

    # Push the file
    run cli_with_host push "my file (1).md" --project-id "$PROJECT_ID"
    assert_success

    # Delete and pull back
    rm "my file (1).md"
    run cli_with_host pull "my file (1).md" --project-id "$PROJECT_ID"
    assert_success

    # Verify
    assert [ -f "my file (1).md" ]
    assert [ "$(cat "my file (1).md")" = "content" ]
}

@test "CLI pull from empty project" {
    # Create a new project ID for this test
    local EMPTY_PROJECT_ID="empty-project-$(date +%s)"

    # Pull from empty project should succeed without error
    run cli_with_host pull --all --project-id "$EMPTY_PROJECT_ID"
    assert_success

    # No files should be created
    assert [ -z "$(ls -A)" ]
}