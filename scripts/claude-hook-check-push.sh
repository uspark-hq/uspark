#!/bin/bash

# Claude Code Hook Script for Git Push Interception
# This script is called by Claude Code's PreToolUse hook

# Read the command from stdin (Claude passes tool input as JSON)
TOOL_INPUT=$(cat)
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.tool_input.command // ""')

# Check if it's a git push command
if echo "$COMMAND" | grep -qE "git\s+push"; then
    echo "🔍 Pre-push CI check triggered by Claude Code hook..." >&2
    
    # Run CI checks with dev environment settings
    # Skip DB and Vercel checks in development
    export SKIP_DB_CHECK=1
    export SKIP_VERCEL_CHECK=1
    
    # Run the CI check script, redirect output to stderr
    if "$(dirname "$0")/ci-check.sh" >&2; then
        echo "✅ CI checks passed, allowing git push" >&2
        # Return correct format for Claude Code hook
        echo '{
          "hookEventName": "PreToolUse",
          "permissionDecision": "allow",
          "permissionDecisionReason": "CI checks passed successfully"
        }'
    else
        echo "❌ CI checks failed, blocking git push" >&2
        # Return correct format to block the command
        echo '{
          "hookEventName": "PreToolUse",
          "permissionDecision": "deny",
          "permissionDecisionReason": "CI checks failed. Please fix the lint/format issues and try again."
        }'
    fi
else
    # Not a git push, allow it
    echo '{
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow"
    }'
fi