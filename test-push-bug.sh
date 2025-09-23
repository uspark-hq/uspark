#!/bin/bash

# Test script to reproduce the push bug

set -e

echo "=== Setting up test environment ==="

# Create temp directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"
echo "Working in: $TEST_DIR"

# Create test files
echo "foo" > foo.md
echo "bar" > bar.md
echo "hello" > hello.md

echo ""
echo "=== Files created ==="
ls -la *.md
echo ""
echo "=== File contents ==="
for f in *.md; do
  echo "$f: $(cat $f)"
done

# Build CLI
echo ""
echo "=== Building CLI ==="
cd /workspaces/uspark/turbo
pnpm --filter @uspark/cli build

# Push files
echo ""
echo "=== Pushing files ==="
cd "$TEST_DIR"
PROJECT_ID="test-$(date +%s)"
echo "Using project ID: $PROJECT_ID"

# Run push with debug output
NODE_ENV=development /workspaces/uspark/turbo/apps/cli/dist/index.js push --all --project-id "$PROJECT_ID" 2>&1 | tee push-output.log

echo ""
echo "=== Deleting local files ==="
rm -f *.md
ls -la *.md 2>/dev/null || echo "All .md files deleted"

echo ""
echo "=== Pulling files back ==="
/workspaces/uspark/turbo/apps/cli/dist/index.js pull --all --project-id "$PROJECT_ID"

echo ""
echo "=== Verifying pulled files ==="
for f in foo.md bar.md hello.md; do
  if [ -f "$f" ]; then
    content=$(cat "$f")
    echo "$f: '$content'"
    case "$f" in
      foo.md) [ "$content" = "foo" ] && echo "  ✓ Content matches" || echo "  ✗ Expected 'foo', got '$content'" ;;
      bar.md) [ "$content" = "bar" ] && echo "  ✓ Content matches" || echo "  ✗ Expected 'bar', got '$content'" ;;
      hello.md) [ "$content" = "hello" ] && echo "  ✓ Content matches" || echo "  ✗ Expected 'hello', got '$content'" ;;
    esac
  else
    echo "$f: NOT FOUND - ✗"
  fi
done

# Cleanup
echo ""
echo "=== Cleaning up ==="
cd /
rm -rf "$TEST_DIR"

echo "Test complete!"