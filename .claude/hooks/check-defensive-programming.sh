#!/bin/bash

# Hook to check for new try/catch blocks and remind AI about defensive programming principles
# This runs after Edit, MultiEdit, or Write operations

set -e

# Parse the hook input JSON
INPUT=$(cat)

# Extract tool information
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input')

# Only check for file editing operations
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "MultiEdit" && "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# Extract file path from tool input
FILE_PATH=""
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "MultiEdit" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path')
elif [[ "$TOOL_NAME" == "Write" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path')
fi

# Only check TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Check if file exists (might be a new file)
if [[ ! -f "$FILE_PATH" ]]; then
    exit 0
fi

# Get the new content to analyze
NEW_CONTENT=""
if [[ "$TOOL_NAME" == "Write" ]]; then
    NEW_CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content')
elif [[ "$TOOL_NAME" == "Edit" ]]; then
    NEW_STRING=$(echo "$TOOL_INPUT" | jq -r '.new_string')
    # Check if new_string contains try/catch
    if echo "$NEW_STRING" | grep -q "try\s*{"; then
        NEW_CONTENT="$NEW_STRING"
    fi
elif [[ "$TOOL_NAME" == "MultiEdit" ]]; then
    # Check each edit for try/catch
    NEW_CONTENT=$(echo "$TOOL_INPUT" | jq -r '.edits[].new_string' | grep -l "try\s*{" || true)
fi

# Check for new try/catch blocks
if [[ -n "$NEW_CONTENT" ]] && echo "$NEW_CONTENT" | grep -q "try\s*{"; then
    # Found try/catch - provide feedback to AI
    cat << 'EOF'
{
  "decision": "continue",
  "reason": "⚠️  DEFENSIVE PROGRAMMING CHECK: I noticed you added a try/catch block. Please reflect on whether this follows the 'Avoid Defensive Programming' principle from CLAUDE.md:\n\n• Only catch exceptions when you can meaningfully handle them\n• Let errors bubble up to where they can be properly addressed\n• Avoid defensive try/catch blocks that just log and re-throw\n• Trust the runtime and framework error handling\n\nIf this try/catch provides specific error recovery logic (like showing user-friendly messages in UI), it's appropriate. If it's just catching and re-throwing for 'safety', consider removing it to let errors propagate naturally."
}
EOF
else
    # No try/catch found, continue normally
    exit 0
fi