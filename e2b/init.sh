#!/bin/bash
set -e

echo "🚀 Initializing E2B container for Claude Code execution..."

# Ensure workspace directory exists and is writable
if [ ! -w /workspace ]; then
  echo "⚠️ Warning: /workspace is not writable, attempting to fix permissions..."
  # Try to fix permissions if running as root or with sudo
  if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
    sudo chown -R $(id -u):$(id -g) /workspace 2>/dev/null || true
  fi
fi

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