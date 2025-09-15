# Polling System Design

## Overview

This document defines the polling system for real-time updates in uSpark. The system handles two main types of polling:
1. **Claude execution status** - Monitor Turn/Block creation from E2B
2. **Document changes** - Detect YJS document updates

## Core Requirements

### 1. Turn Status Polling

Monitor the execution status of Claude Code in E2B containers.

#### Frontend Hook

```typescript
// hooks/useSessionPolling.ts
interface UseSessionPollingOptions {
  sessionId: string;
  turnId?: string;
  enabled?: boolean;
  interval?: number; // default: 2000ms
  onUpdate?: (turn: Turn) => void;
  onComplete?: (turn: Turn) => void;
  onError?: (error: Error) => void;
}

function useSessionPolling({
  sessionId,
  turnId,
  enabled = true,
  interval = 2000,
  onUpdate,
  onComplete,
  onError
}: UseSessionPollingOptions) {
  // Poll GET /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}
  // Check turn.status: pending | running | completed | failed
  // Stop polling when status is completed or failed
  // Call appropriate callbacks
}
```

#### Polling States

```typescript
type TurnStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Turn {
  id: string;
  status: TurnStatus;
  blocks: Block[];
  error?: string;
  started_at?: Date;
  completed_at?: Date;
}
```

#### Usage Example

```tsx
function ChatInterface() {
  const [currentTurnId, setCurrentTurnId] = useState<string>();

  const { data: turn, isPolling } = useSessionPolling({
    sessionId,
    turnId: currentTurnId,
    enabled: !!currentTurnId,
    onComplete: (turn) => {
      // Display completed response
      setCurrentTurnId(undefined);
    },
    onError: (error) => {
      // Show error message
      console.error('Turn failed:', error);
    }
  });

  // Show streaming blocks as they arrive
  return (
    <div>
      {turn?.blocks.map(block => (
        <BlockDisplay key={block.id} block={block} />
      ))}
      {isPolling && <LoadingIndicator />}
    </div>
  );
}
```

### 2. Document Change Polling

Monitor YJS document changes when Claude modifies files.

#### Frontend Hook

```typescript
// hooks/useDocumentPolling.ts
interface UseDocumentPollingOptions {
  projectId: string;
  filePaths?: string[]; // Specific files to monitor
  enabled?: boolean;
  interval?: number; // default: 3000ms
  onDocumentChange?: (changes: DocumentChange[]) => void;
}

interface DocumentChange {
  filePath: string;
  lastModified: Date;
  changeType: 'created' | 'modified' | 'deleted';
}

function useDocumentPolling({
  projectId,
  filePaths,
  enabled = true,
  interval = 3000,
  onDocumentChange
}: UseDocumentPollingOptions) {
  // Poll GET /api/projects/{projectId}/files
  // Compare file timestamps or version numbers
  // Trigger YJS sync for changed files
  // Call onDocumentChange callback
}
```

#### Usage Example

```tsx
function DocumentExplorer() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useDocumentPolling({
    projectId,
    enabled: true,
    onDocumentChange: (changes) => {
      // Refresh document list
      changes.forEach(change => {
        if (change.changeType === 'created') {
          // Add to list
        } else if (change.changeType === 'modified') {
          // Update in list
        } else if (change.changeType === 'deleted') {
          // Remove from list
        }
      });
    }
  });

  return <FileTree documents={documents} />;
}
```

### 3. Combined Polling Manager

Coordinate multiple polling operations to avoid overwhelming the server.

```typescript
// hooks/usePollingManager.ts
class PollingManager {
  private polls: Map<string, NodeJS.Timeout> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private maxConcurrent = 3;
  private activeRequests = 0;

  register(key: string, pollFn: () => Promise<void>, interval: number) {
    // Deduplicate and manage polling intervals
    // Queue requests if too many concurrent
    // Automatic backoff on errors
  }

  unregister(key: string) {
    // Clean up polling when component unmounts
  }

  pause() {
    // Pause all polling (e.g., when tab is hidden)
  }

  resume() {
    // Resume polling (e.g., when tab is visible)
  }
}

// Global singleton
export const pollingManager = new PollingManager();
```

## Implementation Strategy

### Backend Optimization

1. **Efficient Status Endpoint**
```typescript
// GET /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}/status
// Return minimal data for polling
{
  "status": "running",
  "block_count": 3,
  "last_updated": "2025-01-06T10:00:00Z"
}
```

2. **Batch Document Status**
```typescript
// POST /api/projects/{projectId}/files/status
// Body: { "paths": ["file1.md", "file2.md"] }
// Return only changed files
{
  "changes": [
    {
      "path": "file1.md",
      "last_modified": "2025-01-06T10:00:00Z",
      "version": 5
    }
  ]
}
```

### Frontend Optimization

1. **Intelligent Polling**
- Start with 1s interval during active execution
- Gradually increase to 5s after 30 seconds
- Stop polling after 2 minutes timeout
- Resume on user interaction

2. **Request Deduplication**
- Multiple components requesting same data share single poll
- Cache results for 500ms to prevent duplicate requests

3. **Error Handling**
- Exponential backoff on errors (2s, 4s, 8s, 16s)
- Max 5 retries before stopping
- Clear error state on successful request

### Performance Considerations

1. **Network Efficiency**
- Use ETags for document polling
- Return 304 Not Modified when unchanged
- Compress responses with gzip

2. **Battery/CPU Optimization**
- Pause polling when tab is not visible
- Reduce frequency on mobile devices
- Stop polling after user inactivity (5 minutes)

3. **State Management**
- Use React Query or SWR for caching
- Optimistic updates for better UX
- Invalidate cache on user actions

## Migration Path

### Phase 1: Basic Implementation
- Simple setInterval polling
- No optimization
- Direct API calls

### Phase 2: Optimization
- Add PollingManager
- Implement backoff
- Request deduplication

### Phase 3: Advanced Features
- WebSocket upgrade path (post-MVP)
- Server-sent events option
- Real-time collaboration

## Testing Strategy

1. **Unit Tests**
- Mock timers for polling intervals
- Test backoff logic
- Verify cleanup on unmount

2. **Integration Tests**
- Test with real API endpoints
- Verify state synchronization
- Test error scenarios

3. **Performance Tests**
- Monitor network requests
- Check CPU usage
- Measure battery impact

## Known Limitations

1. **Polling Delay** - 2-3 second delay for updates
2. **Network Load** - Continuous requests even when idle
3. **Scale Limits** - Not suitable for >100 concurrent users

## Post-MVP Improvements

1. **WebSocket Upgrade** - Real-time bidirectional communication
2. **Server-Sent Events** - One-way real-time updates
3. **GraphQL Subscriptions** - Selective field updates
4. **Push Notifications** - Background updates