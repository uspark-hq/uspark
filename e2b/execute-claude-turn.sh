#!/bin/bash

# ==============================================================================
# uSpark Claude Turn Execution Script
# ==============================================================================
# This script executes a complete Claude turn from start to finish:
# 1. Sync project files (git pull + uspark pull)
# 2. Execute Claude pipeline (prompt → claude → watch-claude)
# 3. Cleanup
#
# Required environment variables:
#   - TURN_ID: The turn ID for this execution
#   - SESSION_ID: The session ID
#
# Note: PROJECT_ID, USPARK_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GITHUB_TOKEN
#       are set at sandbox creation time and available globally
#
# Logging:
#   All output (stdout and stderr) should be redirected by the caller.
#   Example: TURN_ID="..." SESSION_ID="..." /usr/local/bin/execute-claude-turn.sh > /tmp/execute_DATETIME.log 2>&1
#
# Usage:
#   TURN_ID="turn_123" SESSION_ID="sess_456" /usr/local/bin/execute-claude-turn.sh
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

# Required environment variables (set when executing this script)
: "${TURN_ID:?TURN_ID is required}"
: "${SESSION_ID:?SESSION_ID is required}"

# These should be set at sandbox creation time
: "${PROJECT_ID:?PROJECT_ID is required}"
: "${USPARK_TOKEN:?USPARK_TOKEN is required}"
: "${CLAUDE_CODE_OAUTH_TOKEN:?CLAUDE_CODE_OAUTH_TOKEN is required}"

# Fixed paths
WORKSPACE_DIR="$HOME/workspace"
USPARK_OUTPUT_DIR="$WORKSPACE_DIR/.uspark"
PROMPT_FILE="/tmp/prompt_${TURN_ID}.txt"

# ==============================================================================
# Utility Functions
# ==============================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
  log "ERROR: $*"
  exit 1
}

# ==============================================================================
# Validate Prerequisites
# ==============================================================================

log "=== Starting Claude Turn Execution ==="
log "Project ID: $PROJECT_ID"
log "Turn ID: $TURN_ID"
log "Session ID: $SESSION_ID"
log "Workspace: $WORKSPACE_DIR"

# Check if prompt file exists
if [[ ! -f "$PROMPT_FILE" ]]; then
  error "Prompt file not found: $PROMPT_FILE"
fi

# Check if required commands are available
for cmd in uspark git tee claude; do
  if ! command -v "$cmd" &>/dev/null; then
    error "Required command not found: $cmd"
  fi
done

log "Prerequisites validated"

# ==============================================================================
# Phase 1: File Synchronization
# ==============================================================================

log "=== Phase 1: Syncing Project Files ==="

# Ensure workspace directory exists
mkdir -p "$WORKSPACE_DIR"

# Idempotent Git repository initialization and sync
if [[ -d "$WORKSPACE_DIR/.git" ]]; then
  # Repository already exists - sync latest changes
  log "Git repository detected, syncing latest changes..."
  cd "$WORKSPACE_DIR"

  git reset --hard origin/main
  git pull origin main

  # Ensure .gitignore contains .uspark
  if ! grep -q "^\.uspark$" .gitignore 2>/dev/null; then
    log "Adding .uspark to .gitignore"
    echo ".uspark" >> .gitignore
  fi

  log "Git sync completed"
elif [[ -n "${REPO_URL:-}" ]]; then
  # Repository doesn't exist but REPO_URL is provided - clone it
  log "Cloning Git repository: $REPO_URL"

  # Remove workspace if it exists but is not a git repo
  if [[ -d "$WORKSPACE_DIR" ]]; then
    log "Removing non-git workspace directory"
    rm -rf "$WORKSPACE_DIR"
  fi

  # Clone repository
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    git clone "https://${GITHUB_TOKEN}@github.com/${REPO_URL}.git" "$WORKSPACE_DIR"
  else
    git clone "https://github.com/${REPO_URL}.git" "$WORKSPACE_DIR"
  fi

  cd "$WORKSPACE_DIR"

  # Ensure .gitignore contains .uspark
  if ! grep -q "^\.uspark$" .gitignore 2>/dev/null; then
    log "Adding .uspark to .gitignore"
    echo ".uspark" >> .gitignore
  fi

  log "Git clone completed"
else
  # No repository - just use workspace directory
  log "No Git repository configured, using workspace directory"
  cd "$WORKSPACE_DIR"
fi

# Pull uSpark project files
log "Pulling uSpark project files..."

uspark pull \
  --all \
  --project-id "$PROJECT_ID" \
  --output-dir "$USPARK_OUTPUT_DIR" \
  --verbose

log "Project files synced successfully"

# ==============================================================================
# Phase 2: Claude Execution Pipeline
# ==============================================================================

log "=== Phase 2: Executing Claude Pipeline ==="
log "Prompt file: $PROMPT_FILE"

# Execute the complete pipeline:
# 1. Read prompt from file
# 2. Pipe to Claude Code with streaming JSON output
# 3. Pipe to uspark watch-claude for real-time processing and file sync
cat "$PROMPT_FILE" | \
  claude --print --verbose \
    --output-format stream-json \
    --dangerously-skip-permissions | \
  uspark watch-claude \
    --project-id "$PROJECT_ID" \
    --turn-id "$TURN_ID" \
    --session-id "$SESSION_ID" \
    --prefix .uspark

PIPELINE_EXIT_CODE=$?

# ==============================================================================
# Phase 3: Cleanup
# ==============================================================================

log "=== Phase 3: Cleanup ==="

# Clean up prompt file
if [[ -f "$PROMPT_FILE" ]]; then
  log "Removing prompt file: $PROMPT_FILE"
  rm -f "$PROMPT_FILE"
fi

# ==============================================================================
# Exit
# ==============================================================================

if [[ $PIPELINE_EXIT_CODE -eq 0 ]]; then
  log "=== Turn Execution Completed Successfully ==="
  exit 0
else
  error "Turn execution failed with exit code: $PIPELINE_EXIT_CODE"
fi
