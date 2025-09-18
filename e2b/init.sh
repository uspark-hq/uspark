#!/bin/bash
set -e

echo "🚀 Initializing E2B container for Claude Code execution..."

# Verify required environment variables
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: PROJECT_ID environment variable is required"
  exit 1
fi

if [ -z "$USPARK_TOKEN" ]; then
  echo "❌ Error: USPARK_TOKEN environment variable is required"
  exit 1
fi

if [ -z "$CLAUDE_API_KEY" ]; then
  echo "❌ Error: CLAUDE_API_KEY environment variable is required"
  exit 1
fi

echo "✅ Environment variables validated"
echo "📁 Project ID: $PROJECT_ID"

# Pull project files from uSpark
echo "📥 Pulling project files..."
if uspark pull --project-id "$PROJECT_ID"; then
  echo "✅ Project files pulled successfully"
else
  echo "❌ Failed to pull project files"
  exit 1
fi

# List pulled files for verification
echo "📋 Project files:"
find /workspace -type f -name "*.md" | head -10

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