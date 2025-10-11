# E2B Runtime Container Specification (MVP)

## Overview

This document defines the specification for running Claude Code CLI within E2B containers, enabling a secure and isolated runtime environment for AI-assisted development. The integration uses uspark sync to maintain file synchronization between the host environment and the containerized Claude Code runtime.

## Architecture

```
Server Environment            E2B Container                  Claude Code CLI
      |                           |                              |
      |-- 1. Start container ---> |                              |
      |    (with PROJECT_ID)      |                              |
      |                           |                              |
      |                           |-- 2. uspark pull ----------> |
      |                           |    --project-id a1b2c3       |
      |                           |    (pull entire project)     |
      |                           |                              |
      |                           |-- 3. claude --output-json -> |
      |                           |           |                  |
      |                           |    uspark watch-claude       |
      |                           |    (real-time sync)          |
      |                           |           |                  |
      |<-- 4. Status updates -------|<-- File writes detected ----|
      |    (via uspark sync push) |    and pushed immediately   |
```

## Container Workflow

### Phase 1: Environment Preparation

1. **E2B Container Startup**

   - Server environment starts E2B container with Node.js runtime
   - Container comes pre-installed with uspark CLI and Claude Code CLI
   - Configure authentication for uspark sync operations via environment variables

2. **Project Synchronization (Server → Container)**
   - Container automatically executes `uspark pull --project-id a1b2c3`
   - Entire project is pulled from YJS database into container filesystem
   - All files are materialized and ready for Claude Code execution

### Phase 2: Claude Code Execution with Status Monitoring

3. **Claude Code CLI with Watch Integration**
   - Execute Claude Code CLI with JSON output format and permissions bypass
   - Pipe output through `uspark watch-claude` for status monitoring
   - Watch-claude acts as a transparent proxy, preserving stdout
   - File modifications are detected and synced immediately

### Phase 3: Status-based Synchronization

4. **File Change Detection**

   - `uspark watch-claude` intercepts file write operations
   - Each detected change triggers immediate `uspark sync push`
   - No need for post-execution batch synchronization

5. **Continuous Host Updates**
   - Host can monitor changes via polling
   - Files are available immediately after Claude writes them
   - Status monitoring enables progress tracking

## E2B Container Configuration

### Base Container Requirements

```dockerfile
# Base E2B container configuration
FROM e2b/code-interpreter:latest

RUN apt-get update && apt-get install -y nodejs npm
RUN npm install -g @uspark/cli @anthropic-ai/claude-code

# Set working directory
WORKDIR /workspace
```

### Environment Variables

```bash
# Authentication
USPARK_TOKEN=<cli-token>           # For uspark sync operations
CLAUDE_API_KEY=<api-key>           # For Claude Code CLI

# Project Configuration
PROJECT_ID=<project-id>            # YJS project identifier
WORKSPACE_PATH=/workspace          # Container workspace directory
```

### Container Initialization Script

```bash
#!/bin/bash

set -e
set -u

# USPARK_TOKEN will be used as environment variable by CLI
export USPARK_TOKEN=$USPARK_TOKEN

# Create workspace directory
mkdir -p $WORKSPACE_PATH
cd $WORKSPACE_PATH

# Pull entire project from YJS
echo "Pulling project files..."
uspark pull --project-id $PROJECT_ID
```

### Container Execution Script

```bash
#!/bin/bash
# execute-claude.sh

set -e

# Execute Claude with status monitoring
claude \
  --dangerously-skip-permissions \
  --prompt "$USER_PROMPT" \
  --output-json | uspark watch-claude --project-id $PROJECT_ID
```

## Synchronization Protocol

### uspark sync Integration

The synchronization leverages the existing YJS-based uspark sync protocol defined in [yjs.md](./yjs.md), enhanced with status monitoring capabilities through `uspark watch-claude`.

#### Pull Operation (YJS → Container)

```bash
# Pull entire project to container
uspark pull --project-id <project-id>

# Pull specific files (for incremental updates)
uspark pull --project-id <project-id> src/specific-file.js
```

#### Push Operation (Container → YJS)

```bash
# Push individual modified file to YJS (used by watch-claude)
uspark push --project-id <project-id> src/modified-file.js

# Push all changes
uspark push --project-id <project-id> --all
```

### File Change Detection with watch-claude

The `uspark watch-claude` command implements file monitoring and synchronization:

```typescript
// watch-claude implementation
import { spawn } from "child_process";
import { createReadStream } from "fs";
import { pipeline } from "stream";

interface ClaudeEvent {
  type: "file_write" | "console" | "error";
  data: {
    path?: string;
    content?: string;
    message?: string;
  };
}

// Parse Claude's JSON output stream
const parseClaudeOutput = (line: string): ClaudeEvent | null => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};

// Watch and sync file changes
export async function watchClaude(projectId: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    // Pass through all output to maintain transparency
    console.log(line);

    const event = parseClaudeOutput(line);
    if (event?.type === "file_write" && event.data.path) {
      // Immediately sync the written file
      await syncFile(projectId, event.data.path);
    }
  });
}

async function syncFile(projectId: string, filePath: string) {
  // Push individual file to YJS immediately
  spawn("uspark", ["push", "--project-id", projectId, filePath], {
    stdio: "ignore", // Run in background
  });
}
```

## Implementation Roadmap

### Phase 1: Core Container Integration

#### 1. E2B Container Setup ✅ COMPLETED

**Acceptance Criteria**:

- [x] Create E2B container template with required dependencies ✅ (PR #314)
- [x] Implement container initialization script ✅ (PR #314)
- [x] Configure authentication and environment variables ✅ (PR #314)
- [x] Test basic container startup and teardown ✅

**Implementation Status**:
- Complete Dockerfile with Node.js 22, Claude Code CLI, and uspark CLI
- Container initialization script (`init.sh`) implemented
- Environment variables properly configured (USPARK_TOKEN, PROJECT_ID, CLAUDE_CODE_OAUTH_TOKEN)
- E2B template ID: `w6qe4mwx23icyuytq64y`

#### 2. uspark watch-claude Implementation ✅ COMPLETED

**Acceptance Criteria**:

- [x] Create watch-claude command parsing Claude's JSON output (✅ PR #100)
- [x] Implement file change detection from JSON events (✅ PR #100)
- [x] Trigger immediate sync push for each file write (✅ PR #100)
- [x] Ensure transparent stdout passthrough (✅ PR #100)

### Phase 2: Claude Code CLI Integration

#### 3. Claude Code Runtime Integration ⏳ PENDING VERIFICATION

**Acceptance Criteria**:

- [x] Configure Claude CLI with proper flags ✅ (Implemented in E2BExecutor)
- [x] Implement JSON stream format parsing ✅ (ClaudeExecutor class)
- [x] Integrate with watch-claude via pipe ✅ (PR #100)
- [x] Handle Claude Code exit and cleanup ✅
- [ ] Test end-to-end workflow with sample prompts ⏳ (Awaiting Web UI refactor)

**Note**: Implementation complete but requires Web UI refactoring for full verification

#### 4. Status Monitoring Architecture ✅ COMPLETED

**Acceptance Criteria**:

- [ ] Implement JSON event parsing
- [ ] Create file write event handlers
- [ ] Maintain stdout transparency for user visibility

## Usage Examples

### Basic Workflow with Status Monitoring

```bash
# 1. Server starts container with status monitoring
docker run -e PROJECT_ID=abc123 -e USPARK_TOKEN=token e2b/uspark-claude \
  /bin/bash -c "
    uspark pull --project-id abc123 &&
    claude --dangerously-skip-permissions \
      --prompt 'Add error handling to the login function' \
      --output-json | uspark watch-claude --project-id abc123
  "

# 2. Changes are synced immediately, server can monitor progress via polling
# No manual collection needed - files are pushed automatically
```

## Integration Points

### API Endpoints

The E2B container integration leverages existing uspark sync API endpoints:

- `GET /api/projects/:projectId` - Retrieve YJS project state
- `PATCH /api/projects/:projectId` - Apply YJS updates
