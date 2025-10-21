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
    if ! cli_with_host auth status | grep -q "Authenticated"; then
        skip "CLI not authenticated - run auth setup first"
    fi
}

teardown() {
    # Return to original directory
    cd "$ORIGINAL_DIR"

    # Clean up temporary directory
    rm -rf "$TEST_DIR"
}

@test "CLI push and pull all files" {
    # Create test files
    echo "foo" > foo.md
    echo "bar" > bar.md

    # Push all files (first run requires --project-id)
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pushed 2 files"

    # Verify .config.json was created
    assert [ -f .config.json ]

    # Delete local files (keep .config.json)
    rm foo.md bar.md
    assert [ ! -f foo.md ]
    assert [ ! -f bar.md ]

    # Pull all files back (uses .config.json)
    run cli_with_host pull
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
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "Successfully pushed 3 files"

    # Delete all files and directories
    rm -rf README.md docs src

    # Pull all files back
    run cli_with_host pull
    assert_success

    # Verify directory structure and content
    assert [ -f README.md ]
    assert [ -f docs/guides/intro.md ]
    assert [ -f src/index.js ]
    assert [ "$(cat README.md)" = "# README" ]
    assert [ "$(cat docs/guides/intro.md)" = "## Guide" ]
    assert [ "$(cat src/index.js)" = "// Code" ]
}

@test "CLI pull overwrites existing files" {
    # Create initial files
    echo "original1" > test1.md
    echo "original2" > test2.md

    # Push the files
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success

    # Modify local files
    echo "modified locally" > test1.md
    echo "also modified" > test2.md
    assert [ "$(cat test1.md)" = "modified locally" ]
    assert [ "$(cat test2.md)" = "also modified" ]

    # Pull should overwrite with remote versions
    run cli_with_host pull
    assert_success

    # Verify files were overwritten
    assert [ "$(cat test1.md)" = "original1" ]
    assert [ "$(cat test2.md)" = "original2" ]
}

@test "CLI handles files with special characters in names" {
    # Create files with spaces and special characters
    echo "content1" > "my file (1).md"
    echo "content2" > "test & file.txt"

    # Push all files
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success

    # Delete and pull back
    rm "my file (1).md" "test & file.txt"
    run cli_with_host pull
    assert_success

    # Verify
    assert [ -f "my file (1).md" ]
    assert [ -f "test & file.txt" ]
    assert [ "$(cat "my file (1).md")" = "content1" ]
    assert [ "$(cat "test & file.txt")" = "content2" ]
}

@test "CLI pull from empty project" {
    # Create a new project ID for this test
    local EMPTY_PROJECT_ID="empty-project-$(date +%s)"

    # Pull from empty project should succeed without error
    run cli_with_host pull --project-id "$EMPTY_PROJECT_ID"
    assert_success

    # Only .config.json should be created
    local file_count=$(ls -A | grep -v "^\.config\.json$" | wc -l)
    assert [ "$file_count" -eq 0 ]
}

@test "CLI push with no files shows appropriate message" {
    # Empty directory (except potential .config.json)
    # Push should indicate no files found
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "No changes to push"
}

@test "CLI version increments after each push" {
    # Create a file and push
    echo "v1" > file.md
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success
    assert_output --partial "(version 1)"

    # Modify and push again
    echo "v2" > file.md
    run cli_with_host push
    assert_success
    assert_output --partial "(version 2)"

    # Push again
    echo "v3" > file.md
    run cli_with_host push
    assert_success
    assert_output --partial "(version 3)"
}

@test "CLI project-id override works" {
    # Create files in first project
    echo "project1" > file.md
    run cli_with_host push --project-id "$PROJECT_ID"
    assert_success

    # Use a different project ID explicitly
    local PROJECT_ID_2="test-project-2-$(date +%s)"
    echo "project2" > file2.md
    run cli_with_host push --project-id "$PROJECT_ID_2"
    assert_success

    # Pull from first project should get original file
    rm -f file.md file2.md
    run cli_with_host pull --project-id "$PROJECT_ID"
    assert_success
    assert [ -f file.md ]
    assert [ "$(cat file.md)" = "project1" ]
    assert [ ! -f file2.md ]
}
