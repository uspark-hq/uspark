# E2B Runtime Container Specification

## Overview

This document defines the specification for running Claude Code CLI within E2B containers, enabling a secure and isolated runtime environment for AI-assisted development. The integration uses uspark sync to maintain file synchronization between the host environment and the containerized Claude Code runtime.

## Architecture

```
Host Environment              E2B Container                  Claude Code CLI
      |                           |                              |
      |-- 1. uspark sync push --> |                              |
      |    (sync files to YJS)    |                              |
      |                           |-- 2. uspark sync pull -----> |
      |                           |    (pull from YJS)           |
      |                           |                              |
      |                           |<-- 3. Run Claude Code CLI ---|
      |                           |    (user prompt + changes)   |
      |                           |                              |
      |                           |-- 4. uspark sync push -----> |
      |<-- 5. uspark sync pull -- |    (push changes to YJS)    |
      |    (collect changes)      |                              |
```

## Container Workflow

### Phase 1: Environment Preparation

1. **E2B Container Initialization**
   - Start E2B container with Node.js runtime
   - Install uspark CLI within container
   - Configure authentication for uspark sync operations

2. **File Synchronization (Host → Container)**
   - Execute `uspark sync push --project-id <id> <files>` on host
   - Files are uploaded to YJS database via uspark sync
   - Container pulls files using `uspark sync pull --project-id <id>`
   - Files are materialized in container filesystem

### Phase 2: Claude Code Execution

3. **Claude Code CLI Execution**
   - Run Claude Code CLI within container with user prompt
   - Claude Code operates on synchronized files
   - All file modifications happen within container isolation

### Phase 3: Change Collection

4. **Modified File Detection**
   - Monitor filesystem changes within container
   - Identify files modified by Claude Code CLI

5. **Reverse Synchronization (Container → Host)**
   - Execute `uspark sync push --project-id <id> <modified-files>` in container
   - Host collects changes using `uspark sync pull --project-id <id>`
   - Updated files are available in host environment

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

# Pull initial files from YJS
echo "Pulling project files..."
uspark sync pull --project-id $PROJECT_ID

echo "Container ready for Claude Code execution"
```

## Synchronization Protocol

### uspark sync Integration

The synchronization leverages the existing YJS-based uspark sync protocol defined in [yjs.md](./yjs.md).

#### Pull Operation (YJS → Container)

```bash
# Pull all project files to container
uspark sync pull --project-id <project-id>

# Pull specific files or directories
uspark sync pull --project-id <project-id> src/ package.json
```

#### Push Operation (Container → YJS)

```bash
# Push modified files to YJS
uspark sync push --project-id <project-id> src/modified-file.js

# Push all changes (git-aware)
uspark sync push --project-id <project-id> --all
```

### File Change Detection

The container implements file system monitoring to track Claude Code modifications:

```typescript
// File watcher implementation
import { watch } from 'fs';
import { execSync } from 'child_process';

const watchedPaths = ['/workspace'];
const modifiedFiles = new Set<string>();

// Monitor file changes during Claude Code execution
const watcher = watch('/workspace', { recursive: true }, (eventType, filename) => {
  if (eventType === 'change' && filename) {
    modifiedFiles.add(filename);
  }
});

// After Claude Code exits, sync changes
process.on('exit', () => {
  if (modifiedFiles.size > 0) {
    const fileList = Array.from(modifiedFiles).join(' ');
    execSync(`uspark sync push --project-id ${PROJECT_ID} ${fileList}`);
  }
});
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

#### 2. uspark sync Integration
**Acceptance Criteria**:
- [ ] Implement pull operation (YJS → container)
- [ ] Implement push operation (container → YJS)
- [ ] Add error handling and retry logic
- [ ] Test sync operations with sample files

### Phase 2: Claude Code CLI Integration

#### 3. Claude Code Runtime
**Acceptance Criteria**:
- [ ] Integrate Claude Code CLI within container
- [ ] Implement file change monitoring during execution
- [ ] Handle Claude Code exit and cleanup
- [ ] Test end-to-end workflow with sample prompts

#### 4. Change Detection & Collection
**Acceptance Criteria**:
- [ ] Implement filesystem watcher for modifications
- [ ] Filter relevant file changes (ignore temp files, logs)
- [ ] Batch changed files for efficient sync
- [ ] Test change detection with various file operations

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

### Basic Workflow

```bash
# 1. Initialize container with project files
docker run -e PROJECT_ID=abc123 -e USPARK_TOKEN=token e2b/uspark-claude \
  /bin/bash -c "
    uspark sync pull --project-id abc123 &&
    claude-code 'Add error handling to the login function' &&
    uspark sync push --project-id abc123 --all
  "

# 2. Collect changes on host
uspark sync pull --project-id abc123
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
    volumes:
      - ./workspace:/workspace
    working_dir: /workspace
    command: >
      bash -c "
        uspark sync pull --project-id $$PROJECT_ID &&
        claude-code --interactive &&
        uspark sync push --project-id $$PROJECT_ID --all
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

# Collect results and cleanup
uspark e2b collect --container-id <id>
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