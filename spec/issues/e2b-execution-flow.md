# E2B Container Execution Flow Specification

## Overview

This document defines the technical implementation for executing Claude Code in E2B containers with real-time synchronization to uSpark.

## Container Setup

### Dockerfile Requirements

```dockerfile
# Install uSpark CLI globally
RUN npm install -g @uspark/cli
```

**Note**: Environment variables are injected at runtime, not built into the image.

## Execution Flow

### 1. Create Turn API Endpoint

The `/api/sessions/{sessionId}/turns` endpoint orchestrates the entire execution:

```typescript
async function createTurn(sessionId: string, prompt: string) {
  // Step 1: Create turn record
  const turn = await db.turns.create({
    sessionId,
    prompt,
    status: 'pending'
  });

  // Step 2: Start E2B container
  const sandbox = await E2BSandbox.create();

  // Step 3: Generate temporary token
  const tempToken = await generateTempToken({
    projectId,
    expiresIn: '1h',
    permissions: ['read', 'write']
  });

  // Step 4: Initialize project data
  await sandbox.exec(`USPARK_TOKEN=${tempToken} uspark pull --project-id ${projectId}`);

  // Step 5: Execute Claude Code with pipe to uspark
  const process = await sandbox.exec(`
    claude-code \
      -p "${escapePrompt(prompt)}" \
      --output-format json \
      --continue \
    | USPARK_TOKEN=${tempToken} uspark watch-claude --project-id ${projectId}
  `);

  // Step 6: Subscribe to stdout for blocks
  process.stdout.on('data', (data) => {
    const block = parseClaudeOutput(data);
    await db.blocks.create({
      turnId: turn.id,
      ...block
    });
  });

  // Step 7: Update turn status on completion
  process.on('exit', (code) => {
    await db.turns.update(turn.id, {
      status: code === 0 ? 'completed' : 'failed'
    });
    await sandbox.close();
  });

  return turn;
}
```

### 2. Data Flow Pipeline

```
User Prompt
    ↓
Create Turn API
    ↓
E2B Container Start
    ↓
uspark pull (download project files)
    ↓
Claude Code Execution
    ↓ (JSON output via stdout)
Pipe to uspark watch-claude
    ↓ (detect file changes)
Auto-push changes to uSpark
    ↓
Update Turn status
```

### 3. Claude Code Integration

#### Command Structure

```bash
claude-code \
  -p "<user_prompt>" \          # User's prompt
  --output-format json \         # JSON format for parsing
  --continue                     # Continue existing session
```

#### Output Format

Claude Code with `--output-format json` outputs structured events:

```json
{
  "type": "file_write",
  "path": "/project/tasks/new-task.md",
  "content": "..."
}
```

### 4. uSpark CLI Watch Mode

The `uspark watch-claude` command:

1. Reads JSON events from stdin
2. Detects file operations (create/update/delete)
3. Automatically pushes changes to uSpark API
4. Maintains sync state

```typescript
// Pseudo-code for watch-claude
async function watchClaude() {
  const rl = readline.createInterface({ input: process.stdin });

  for await (const line of rl) {
    const event = JSON.parse(line);

    switch (event.type) {
      case 'file_write':
        await usparkAPI.updateFile(projectId, event.path, event.content);
        break;
      case 'file_delete':
        await usparkAPI.deleteFile(projectId, event.path);
        break;
    }
  }
}
```

### 5. Block Generation

Blocks are created from Claude's stdout:

```typescript
function parseClaudeOutput(data: string): Block {
  const json = JSON.parse(data);

  return {
    type: mapEventTypeToBlockType(json.type),
    content: json.content || json.message,
    metadata: {
      path: json.path,
      timestamp: new Date()
    }
  };
}
```

## Security Considerations

### Temporary Token Management

```typescript
interface TempToken {
  token: string;
  projectId: string;
  expiresAt: Date;
  permissions: ('read' | 'write')[];
  containerId: string;  // Bind token to specific container
}
```

- Tokens expire after 1 hour
- Tokens are bound to specific project and container
- Tokens are revoked when container exits

## Error Handling

### Container Failures

```typescript
try {
  const sandbox = await E2BSandbox.create();
  // ... execution
} catch (error) {
  await db.turns.update(turn.id, {
    status: 'failed',
    error: error.message
  });

  // Clean up any partial state
  await revokeToken(tempToken);
}
```

### Sync Failures

If `uspark watch-claude` fails:
1. Turn is marked as failed
2. User is notified of sync issues
3. Manual recovery via web UI

## Implementation Checklist

- [ ] Update Dockerfile with `@uspark/cli` installation
- [ ] Implement temporary token generation API
- [ ] Create `watch-claude` command in CLI
- [ ] Implement Create Turn API with E2B integration
- [ ] Add stdout parsing for block generation
- [ ] Test end-to-end flow
- [ ] Add error recovery mechanisms
- [ ] Performance optimization for large files

## Performance Considerations

### Optimization Strategies

1. **Streaming Updates**: Don't buffer entire Claude output
2. **Batch File Operations**: Group multiple small changes
3. **Compression**: Compress file content for large documents
4. **Connection Pooling**: Reuse E2B containers when possible

### Monitoring

Track key metrics:
- Container startup time
- Claude execution duration
- File sync latency
- Token usage patterns
- Error rates

## Testing Strategy

### Unit Tests

- Token generation and validation
- Claude output parsing
- Block creation logic

### Integration Tests

- Full E2B container lifecycle
- File synchronization accuracy
- Error recovery paths

### End-to-End Tests

- Complete user flow from prompt to updated documents
- Multiple concurrent executions
- Large file handling

## Migration Path

### Phase 1: Container Setup
1. Update Dockerfile
2. Deploy new container image
3. Verify CLI availability

### Phase 2: API Implementation
1. Implement token generation
2. Create Turn API with E2B
3. Add block generation

### Phase 3: CLI Enhancement
1. Implement `watch-claude` command
2. Test pipe integration
3. Deploy CLI update

### Phase 4: Production Rollout
1. Enable for beta users
2. Monitor performance
3. Full rollout

## Advantages of This Approach

1. **Simplicity**: Unix pipe philosophy - each tool does one thing well
2. **Real-time**: Changes sync immediately as Claude works
3. **Security**: Temporary tokens with minimal permissions
4. **Reliability**: Clear data flow with proper error boundaries
5. **Scalability**: Stateless containers can scale horizontally

## Known Limitations

1. **Claude SDK Dependency**: Requires Claude Code CLI in headless mode
2. **Container Cold Start**: Initial container startup adds latency
3. **Token Expiry**: Long-running tasks may need token refresh
4. **Network Dependency**: Requires stable connection for sync

## Future Enhancements

1. **Container Pooling**: Pre-warm containers for faster starts
2. **Incremental Sync**: Only sync changed parts of files
3. **Multi-Model Support**: Add support for other AI models
4. **Checkpoint/Resume**: Allow pausing and resuming long tasks