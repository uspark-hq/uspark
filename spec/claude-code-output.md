# Claude Code CLI Output Format Specification

## Overview

This document defines the output format of the Claude Code CLI when using different output modes, based on real execution analysis. This information is critical for implementing the `uspark watch-claude` command that parses Claude's output to detect file modifications.

## Output Format Types

### 1. JSON Format (`--output-format json`)

Single JSON object returned after execution completion.

**Example**:
```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 16049,
  "duration_api_ms": 15987,
  "num_turns": 8,
  "result": "I need permission to edit the test-file.txt. Please grant write access to this file so I can add the comment at the top.",
  "session_id": "f18f49de-5b8f-4261-99c4-dbbaa6ae0e24",
  "total_cost_usd": 0.34641974999999997,
  "usage": {
    "input_tokens": 8,
    "cache_creation_input_tokens": 192,
    "cache_read_input_tokens": 17004,
    "output_tokens": 32,
    "server_tool_use": {
      "web_search_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 0,
      "ephemeral_5m_input_tokens": 192
    }
  },
  "permission_denials": [
    {
      "tool_name": "Edit",
      "tool_use_id": "toolu_01YYFVhDQ23gEi3n4XxGxZyz",
      "tool_input": {
        "file_path": "/workspaces/uspark6/turbo/apps/cli/test-file.txt",
        "old_string": "This is a test file for Claude to modify.",
        "new_string": "# This is a comment added at the top\nThis is a test file for Claude to modify."
      }
    }
  ],
  "uuid": "49ef0707-272e-4de7-b824-b60f5abe254b"
}
```

### 2. Stream JSON Format (`--output-format stream-json --verbose`)

Real-time streaming JSON events, one per line. This is the format used by `uspark watch-claude`.

## Stream JSON Event Types

### System Initialization Event
```json
{
  "type": "system",
  "subtype": "init",
  "cwd": "/workspaces/uspark6/turbo/apps/cli",
  "session_id": "e8889acf-5473-49e2-bd81-4896717df7c7",
  "tools": ["Task", "Bash", "Glob", "Grep", "ExitPlanMode", "Read", "Edit", "MultiEdit", "Write", "NotebookEdit", "WebFetch", "TodoWrite", "WebSearch", "BashOutput", "KillBash"],
  "mcp_servers": [],
  "model": "claude-opus-4-1-20250805",
  "permissionMode": "bypassPermissions",
  "slash_commands": ["add-dir", "agents", "clear", "compact", "config", "context", "cost", "doctor", "exit", "help", "ide", "init", "install-github-app", "mcp", "memory", "migrate-installer", "model", "output-style", "output-style:new", "pr-comments", "release-notes", "resume", "status", "statusline", "todos", "feedback", "review", "security-review", "upgrade", "vim", "permissions", "privacy-settings", "hooks", "export", "logout", "login", "bashes"],
  "apiKeySource": "none",
  "output_style": "default",
  "uuid": "24d854bf-c7b4-4ad5-806b-e44f079b12de"
}
```

### Assistant Message with Text
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01KG2kL94VWFMh6mn39mbonY",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-1-20250805",
    "content": [
      {
        "type": "text",
        "text": "I'll add a comment at the top of the test-file.txt file."
      }
    ],
    "stop_reason": null,
    "stop_sequence": null,
    "usage": {
      "input_tokens": 4,
      "cache_creation_input_tokens": 5355,
      "cache_read_input_tokens": 11292,
      "cache_creation": {
        "ephemeral_5m_input_tokens": 5355,
        "ephemeral_1h_input_tokens": 0
      },
      "output_tokens": 2,
      "service_tier": "standard"
    }
  },
  "parent_tool_use_id": null,
  "session_id": "e8889acf-5473-49e2-bd81-4896717df7c7",
  "uuid": "55848d72-937f-4a1e-82be-34b11348bc70"
}
```

### Assistant Message with Tool Use (File Modification)
**This is the key event type that `uspark watch-claude` needs to detect.**

#### Read Tool Example
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01KG2kL94VWFMh6mn39mbonY",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-1-20250805",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_017HMCrsMgcpEowCw4etFxi6",
        "name": "Read",
        "input": {
          "file_path": "/workspaces/uspark6/turbo/apps/cli/test-file.txt"
        }
      }
    ]
  }
}
```

#### Edit Tool Example (File Modification - Triggers Sync)
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01L4KGYxCvrNk3LeK75sDLvo",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-1-20250805",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01HgD157dhSct5BJqj6p75ua",
        "name": "Edit",
        "input": {
          "file_path": "/workspaces/uspark6/turbo/apps/cli/test-file.txt",
          "old_string": "This is a test file for Claude to modify.",
          "new_string": "# Test file comment\nThis is a test file for Claude to modify."
        }
      }
    ]
  }
}
```

### User Message with Tool Result
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_01HgD157dhSct5BJqj6p75ua",
        "type": "tool_result",
        "content": "The file /workspaces/uspark6/turbo/apps/cli/test-file.txt has been updated. Here's the result of running `cat -n` on a snippet of the edited file:\n     1→# Test file comment\n     2→This is a test file for Claude to modify."
      }
    ]
  },
  "parent_tool_use_id": null,
  "session_id": "e8889acf-5473-49e2-bd81-4896717df7c7",
  "uuid": "a00e2d39-cd12-491d-99e6-ab596822af3b"
}
```

### Final Result Event
```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 18319,
  "duration_api_ms": 21018,
  "num_turns": 6,
  "result": "Done.",
  "session_id": "e8889acf-5473-49e2-bd81-4896717df7c7",
  "total_cost_usd": 0.19243785000000002,
  "usage": {
    "input_tokens": 6,
    "cache_creation_input_tokens": 212,
    "cache_read_input_tokens": 16827,
    "output_tokens": 5,
    "server_tool_use": {
      "web_search_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 0,
      "ephemeral_5m_input_tokens": 212
    }
  },
  "permission_denials": [],
  "uuid": "58d12213-b549-4d1b-9945-1a93a24f93f9"
}
```

## File Modification Tools Detection

### Tools that Modify Files (Trigger Sync)
The following tools indicate file modifications and should trigger synchronization:

1. **Edit** - Modifies existing file content
   - `input.file_path`: Target file path
   - `input.old_string`: Content to replace
   - `input.new_string`: New content

2. **Write** - Creates or overwrites entire file
   - `input.file_path`: Target file path
   - `input.content`: Complete file content

3. **MultiEdit** - Multiple edits to a single file
   - `input.file_path`: Target file path
   - `input.edits`: Array of edit operations

4. **NotebookEdit** - Modifies Jupyter notebook cells
   - `input.notebook_path`: Target notebook path
   - `input.new_source`: Cell content

### Tools that Don't Modify Files (No Sync Needed)
- **Read** - Only reads file content
- **Glob** - File pattern matching
- **Grep** - Search within files
- **Bash** - Command execution (may modify files indirectly)
- **Task** - Delegates to other agents

## Implementation Notes for `uspark watch-claude`

### Detection Algorithm
1. Parse each line as JSON
2. Check if `event.type === "assistant"` and `event.message?.content` exists
3. Iterate through `content` array for items with `type === "tool_use"`
4. Check if `name` is one of the file modification tools
5. Extract `file_path` from `input` object
6. Convert absolute paths to relative paths within project directory
7. Trigger `uspark push` for the detected file

### Path Processing
- Claude uses absolute paths like `/workspaces/uspark6/turbo/apps/cli/test-file.txt`
- Convert to relative paths like `test-file.txt` for sync operations
- Only sync files within the current working directory

### Error Handling
- JSON parsing failures are normal (not all output is JSON)
- Sync failures should be logged to stderr but not interrupt Claude output
- Maintain transparent passthrough of all output to stdout

## Usage Example

```bash
# Run Claude with stream-json output piped to watch-claude
claude --print --verbose --output-format stream-json --dangerously-skip-permissions "Add error handling to login.js" | uspark watch-claude --project-id abc123
```

This will:
1. Execute Claude Code with real-time JSON streaming
2. Detect when Claude uses Edit, Write, MultiEdit, or NotebookEdit tools
3. Immediately sync modified files to the remote project
4. Preserve all Claude output for user visibility