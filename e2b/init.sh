#!/bin/bash
set -e

echo "🚀 Initializing E2B container for Claude Code execution..."

# Use workspace in home directory (always writable for current user)
WORKSPACE_DIR="$HOME/workspace"
echo "📁 Using workspace directory: $WORKSPACE_DIR"

# Ensure workspace directory exists
if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "⚠️ Creating workspace directory..."
  mkdir -p "$WORKSPACE_DIR"
fi

# Verify workspace is writable
if [ ! -w "$WORKSPACE_DIR" ]; then
  echo "❌ Error: Workspace directory $WORKSPACE_DIR is not writable!"
  ls -la "$WORKSPACE_DIR"
  exit 1
fi

echo "✅ Workspace is ready at $WORKSPACE_DIR"

# Verify required environment variables
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: PROJECT_ID environment variable is required"
  exit 1
fi

if [ -z "$USPARK_TOKEN" ]; then
  echo "❌ Error: USPARK_TOKEN environment variable is required"
  exit 1
fi

if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  echo "❌ Error: CLAUDE_CODE_OAUTH_TOKEN environment variable is required"
  exit 1
fi

echo "✅ Environment variables validated"
echo "📁 Project ID: $PROJECT_ID"

# Note: Project files will be pulled by the E2B executor
# This init script just validates the environment

echo "🎯 Container initialized successfully. Ready for Claude Code execution."

# If arguments are provided, execute them
if [ $# -gt 0 ]; then
  echo "🔄 Executing command: $@"
  exec "$@"
else
  # Keep container running for interactive use
  echo "⏳ Container ready. Keeping alive..."
  tail -f /dev/null
fi