# E2B Runtime Container Specification

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
      |<-- 4. Streaming updates ---|<-- File writes detected ----|
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

### Phase 2: Real-time Claude Code Execution

3. **Claude Code CLI with Watch Integration**
   - Execute Claude Code CLI with JSON output format and permissions bypass
   - Pipe output through `uspark watch-claude` for real-time monitoring
   - Watch-claude acts as a transparent proxy, preserving stdout
   - File modifications are detected and synced immediately

### Phase 3: Streaming Synchronization

4. **Real-time File Change Detection**
   - `uspark watch-claude` intercepts file write operations
   - Each detected change triggers immediate `uspark sync push`
   - No need for post-execution batch synchronization

5. **Continuous Host Updates**
   - Host can monitor changes in real-time
   - Files are available immediately after Claude writes them
   - Streaming architecture enables live progress tracking

## E2B Container Configuration

### Base Container Requirements

```dockerfile
# Base E2B container configuration
FROM e2b/code-interpreter:latest

# Install Node.js and npm for uspark CLI
RUN apt-get update && apt-get install -y nodejs npm

# Install uspark CLI
RUN npm install -g uspark-cli

# Install Claude Code CLI
RUN npm install -g claude-code

# Install uspark watch-claude tool
RUN npm install -g @uspark/watch-claude

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
# container-init.sh

set -e

echo "Initializing E2B container for Claude Code runtime..."

# Authenticate with uspark
uspark auth login --token $USPARK_TOKEN

# Create workspace directory
mkdir -p $WORKSPACE_PATH
cd $WORKSPACE_PATH

# Pull entire project from YJS
echo "Pulling project files..."
uspark pull --project-id $PROJECT_ID

echo "Container ready for Claude Code execution"
```

### Container Execution Script

```bash
#!/bin/bash
# execute-claude.sh

set -e

# Execute Claude with real-time sync
claude \
  --dangerously-skip-permissions \
  --prompt "$USER_PROMPT" \
  --output-json \
  | uspark watch-claude \
    --project-id $PROJECT_ID \
    --stream-output
```

## Synchronization Protocol

### uspark sync Integration

The synchronization leverages the existing YJS-based uspark sync protocol defined in [yjs.md](./yjs.md), enhanced with real-time streaming capabilities through `uspark watch-claude`.

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

### Real-time File Change Detection with watch-claude

The `uspark watch-claude` command implements real-time file monitoring and synchronization:

```typescript
// watch-claude implementation
import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import { pipeline } from 'stream';

interface ClaudeEvent {
  type: 'file_write' | 'console' | 'error';
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

// Watch and sync file changes in real-time
export async function watchClaude(projectId: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    // Pass through all output to maintain transparency
    console.log(line);
    
    const event = parseClaudeOutput(line);
    if (event?.type === 'file_write' && event.data.path) {
      // Immediately sync the written file
      await syncFile(projectId, event.data.path);
    }
  });
}

async function syncFile(projectId: string, filePath: string) {
  // Push individual file to YJS immediately
  spawn('uspark', ['push', '--project-id', projectId, filePath], {
    stdio: 'ignore' // Run in background
  });
}
```

## Security Considerations

### Container Isolation

1. **Network Isolation**: E2B containers run with restricted network access
2. **Filesystem Isolation**: Container filesystem is isolated from host
3. **Resource Limits**: CPU, memory, and disk usage limits enforced
4. **Execution Timeout**: Maximum runtime limits to prevent runaway processes

### Authentication & Authorization

1. **Token-based Authentication**: uspark CLI tokens for sync operations
2. **Project Scoping**: Users can only access their own projects
3. **Read/Write Permissions**: Fine-grained file access control via YJS

### Data Security

1. **Encrypted Transit**: All sync operations use HTTPS/TLS
2. **Encrypted Storage**: YJS data encrypted at rest in database
3. **Temporary Cleanup**: Container filesystem cleaned after execution
4. **Audit Logging**: All sync operations logged for security monitoring

## Performance Optimizations

### Incremental Synchronization

- Only sync modified files, not entire project
- Use YJS incremental updates for efficient data transfer
- Implement file content deduplication via hash-based storage

### Parallel Processing

- Concurrent file uploads/downloads where possible
- Async file I/O operations to reduce latency
- Batch API operations to minimize network round trips

### Caching Strategy

```typescript
// Container-level caching for frequently accessed files
interface FileCache {
  hash: string;
  content: Buffer;
  lastAccess: number;
}

const fileCache = new Map<string, FileCache>();

// Cache hot files to reduce sync overhead
const getCachedFile = async (path: string, hash: string): Promise<Buffer> => {
  const cached = fileCache.get(path);
  if (cached?.hash === hash) {
    cached.lastAccess = Date.now();
    return cached.content;
  }
  
  // Fetch from YJS if not cached
  const content = await fetchFromYJS(path, hash);
  fileCache.set(path, { hash, content, lastAccess: Date.now() });
  return content;
};
```

## Implementation Roadmap

### Phase 1: Core Container Integration

#### 1. E2B Container Setup
**Acceptance Criteria**:
- [ ] Create E2B container template with required dependencies
- [ ] Implement container initialization script
- [ ] Configure authentication and environment variables
- [ ] Test basic container startup and teardown

#### 2. uspark watch-claude Implementation
**Acceptance Criteria**:
- [ ] Create watch-claude command parsing Claude's JSON output
- [ ] Implement real-time file change detection from JSON events
- [ ] Trigger immediate sync push for each file write
- [ ] Ensure transparent stdout passthrough (tee-like behavior)
- [ ] Add error handling and retry logic for sync failures
- [ ] Test with various Claude output scenarios

### Phase 2: Claude Code CLI Integration

#### 3. Claude Code Runtime Integration
**Acceptance Criteria**:
- [ ] Configure Claude CLI with --dangerously-skip-permissions flag
- [ ] Implement --output-json format parsing
- [ ] Integrate with watch-claude via pipe
- [ ] Handle Claude Code exit and cleanup
- [ ] Test end-to-end workflow with sample prompts

#### 4. Real-time Streaming Architecture
**Acceptance Criteria**:
- [ ] Implement JSON event stream parsing
- [ ] Create file write event handlers
- [ ] Ensure zero-latency sync triggers
- [ ] Maintain stdout transparency for user visibility
- [ ] Test streaming with concurrent file operations

### Phase 3: Production Readiness

#### 5. Security Hardening
**Acceptance Criteria**:
- [ ] Implement proper authentication flow
- [ ] Add input validation and sanitization
- [ ] Configure container resource limits
- [ ] Security audit and penetration testing

#### 6. Performance & Monitoring
**Acceptance Criteria**:
- [ ] Implement caching and optimization strategies
- [ ] Add performance metrics and monitoring
- [ ] Load testing with concurrent containers
- [ ] Documentation and operational guides

## Usage Examples

### Basic Workflow with Real-time Sync

```bash
# 1. Server starts container with streaming sync
docker run -e PROJECT_ID=abc123 -e USPARK_TOKEN=token e2b/uspark-claude \
  /bin/bash -c "
    uspark pull --project-id abc123 &&
    claude --dangerously-skip-permissions \
      --prompt 'Add error handling to the login function' \
      --output-json | uspark watch-claude --project-id abc123
  "

# 2. Changes are synced in real-time, server can monitor progress
# No manual collection needed - files are pushed automatically
```

### Advanced Configuration

```yaml
# docker-compose.yml for development
version: '3.8'
services:
  claude-runtime:
    image: e2b/uspark-claude:latest
    environment:
      - PROJECT_ID=${PROJECT_ID}
      - USPARK_TOKEN=${USPARK_TOKEN}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - USER_PROMPT=${USER_PROMPT}
    volumes:
      - ./workspace:/workspace
    working_dir: /workspace
    command: >
      bash -c "
        uspark pull --project-id $$PROJECT_ID &&
        claude --dangerously-skip-permissions \
          --prompt \"$$USER_PROMPT\" \
          --output-json | \
        uspark watch-claude --project-id $$PROJECT_ID --stream-output
      "
```

## Integration Points

### API Endpoints

The E2B container integration leverages existing uspark sync API endpoints:

- `GET /api/projects/:projectId` - Retrieve YJS project state
- `PATCH /api/projects/:projectId` - Apply YJS updates
- `POST /api/blobs` - Upload file content
- `GET /api/blobs/:hash` - Download file content

### CLI Commands

Extended uspark CLI commands for E2B integration:

```bash
# Start E2B container with project sync
uspark e2b start --project-id <id> --prompt "user prompt"

# Monitor running container
uspark e2b status --container-id <id>

# Real-time file sync command (used within container)
uspark watch-claude --project-id <id> [--stream-output]
  # Reads Claude's JSON output from stdin
  # Detects file write events and syncs immediately
  # Transparently passes through all output to stdout
  # --stream-output: Enable real-time output streaming to host
```

## Benefits

1. **Security Isolation**: Code execution in sandboxed environment
2. **Scalability**: Multiple concurrent Claude Code sessions
3. **State Persistence**: Changes preserved via YJS sync
4. **Resource Management**: Container-level resource controls
5. **Audit Trail**: Complete change tracking and history
6. **Cross-Platform**: Consistent runtime environment regardless of host OS

## Limitations

1. **Network Dependency**: Requires stable internet for sync operations
2. **Container Overhead**: Additional resource usage vs native execution  
3. **Sync Latency**: File transfer time impacts overall performance
4. **Storage Costs**: YJS and blob storage for all project data
5. **Complexity**: Additional moving parts increase potential failure points