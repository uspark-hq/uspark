# Polling System Design

## Overview

This document defines the polling system for real-time updates in uSpark. The system uses long polling for efficient real-time updates without constant client polling.

## Core Architecture

### 1. YJS Snapshot Versioning

#### Database Schema

```sql
-- New table for YJS snapshots
CREATE TABLE project_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot BYTEA NOT NULL, -- YJS state vector or full document
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, version)
);

CREATE INDEX idx_snapshots_project_version ON project_snapshots(project_id, version);

-- Update projects table
ALTER TABLE projects ADD COLUMN current_version INTEGER DEFAULT 0;
```

#### Version Management

```typescript
interface ProjectSnapshot {
  id: string;
  projectId: string;
  version: number;
  snapshot: Uint8Array; // YJS document state
  createdAt: Date;
}

interface Project {
  // ... existing fields
  currentVersion: number;
}
```

### 2. Long Polling API

#### Get Project Updates (Long Poll)

```http
GET /api/projects/{projectId}/updates?version={clientVersion}
```

**Behavior:**
- If `clientVersion < currentVersion`: Return diff immediately
- If `clientVersion === currentVersion`: Hold request until update or timeout
- If `clientVersion > currentVersion`: Return error (client ahead of server)

**Request Parameters:**
- `version`: Client's current version number
- `timeout`: Max wait time in seconds (default: 30s)

**Response:**

```typescript
interface UpdateResponse {
  fromVersion: number;
  toVersion: number;
  operations: YjsDiffOperation[]; // YJS update operations
  hasMore: boolean; // If client is multiple versions behind
}

interface YjsDiffOperation {
  type: 'update' | 'delete' | 'insert';
  data: Uint8Array; // YJS encoded operation
}
```

#### Implementation

```typescript
// Backend API endpoint
async function getProjectUpdates(
  projectId: string,
  clientVersion: number,
  timeout: number = 30000
): Promise<UpdateResponse> {
  const project = await db.projects.findById(projectId);

  // Client is behind - return diff immediately
  if (clientVersion < project.currentVersion) {
    const fromSnapshot = await db.projectSnapshots.findOne({
      projectId,
      version: clientVersion
    });
    const toSnapshot = await db.projectSnapshots.findOne({
      projectId,
      version: project.currentVersion
    });

    const operations = calculateYjsDiff(fromSnapshot, toSnapshot);
    return {
      fromVersion: clientVersion,
      toVersion: project.currentVersion,
      operations,
      hasMore: false
    };
  }

  // Client is current - wait for updates
  if (clientVersion === project.currentVersion) {
    return await waitForUpdate(projectId, clientVersion, timeout);
  }

  // Client is ahead - error
  throw new Error('Client version ahead of server');
}

// Wait for project updates with timeout
async function waitForUpdate(
  projectId: string,
  clientVersion: number,
  timeout: number
): Promise<UpdateResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for updates every 100ms
    await sleep(100);

    const project = await db.projects.findById(projectId);
    if (project.currentVersion > clientVersion) {
      // Update available - calculate and return diff
      return getProjectUpdates(projectId, clientVersion, 0);
    }
  }

  // Timeout - return empty response
  return {
    fromVersion: clientVersion,
    toVersion: clientVersion,
    operations: [],
    hasMore: false
  };
}
```

### 3. Frontend Hook

```typescript
// hooks/useProjectSync.ts
function useProjectSync(projectId: string) {
  const [version, setVersion] = useState(0);
  const [doc, setDoc] = useState<Y.Doc>();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      while (!cancelled) {
        try {
          setSyncing(true);

          // Long poll for updates
          const response = await fetch(
            `/api/projects/${projectId}/updates?version=${version}`,
            {
              signal: AbortSignal.timeout(35000) // Slightly longer than server timeout
            }
          );

          if (!response.ok) throw new Error('Sync failed');

          const update: UpdateResponse = await response.json();

          if (update.operations.length > 0) {
            // Apply YJS operations to local document
            applyOperations(doc, update.operations);
            setVersion(update.toVersion);
          }

          setSyncing(false);
        } catch (error) {
          if (error.name === 'AbortError') {
            // Timeout - retry immediately
            continue;
          }

          console.error('Sync error:', error);
          setSyncing(false);

          // Exponential backoff on error
          await sleep(Math.min(1000 * Math.pow(2, retryCount), 30000));
          retryCount++;
        }
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [projectId, version]);

  return { doc, version, syncing };
}
```

### 4. Update Flow

#### When Document Changes

1. **Save Snapshot**:
```typescript
async function updateProject(projectId: string, yjsUpdate: Uint8Array) {
  await db.transaction(async (tx) => {
    // Get current project
    const project = await tx.projects.findById(projectId);
    const newVersion = project.currentVersion + 1;

    // Save new snapshot
    await tx.projectSnapshots.create({
      projectId,
      version: newVersion,
      snapshot: yjsUpdate,
      createdAt: new Date()
    });

    // Update project version
    await tx.projects.update(projectId, {
      currentVersion: newVersion
    });
  });

  // This will unblock any waiting long-poll requests
}
```

2. **Waiting Requests Unblock**:
- All pending requests for this project check version
- Return diff to clients that were waiting

### 5. Turn Status Updates

For Claude execution status, use a similar pattern:

```http
GET /api/sessions/{sessionId}/turns/{turnId}/updates?blockCount={clientBlockCount}
```

```typescript
interface TurnUpdateResponse {
  turnId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  blocks: Block[]; // New blocks since clientBlockCount
  hasMore: boolean;
}

// Long poll for turn updates
async function getTurnUpdates(
  turnId: string,
  clientBlockCount: number,
  timeout: number = 30000
): Promise<TurnUpdateResponse> {
  const turn = await db.turns.findById(turnId);

  // New blocks available - return immediately
  if (turn.blocks.length > clientBlockCount) {
    return {
      turnId,
      status: turn.status,
      blocks: turn.blocks.slice(clientBlockCount),
      hasMore: false
    };
  }

  // Turn complete - return final status
  if (turn.status === 'completed' || turn.status === 'failed') {
    return {
      turnId,
      status: turn.status,
      blocks: [],
      hasMore: false
    };
  }

  // Wait for updates
  return await waitForTurnUpdate(turnId, clientBlockCount, timeout);
}
```

## Advantages of This Approach

1. **Efficiency**: No constant polling - server holds connection until update
2. **Real-time**: Updates delivered immediately when available
3. **Scalability**: Fewer requests than traditional polling
4. **Reliability**: Version-based sync prevents lost updates
5. **Simplicity**: No WebSocket complexity

## Implementation Considerations

### Connection Management

1. **Timeout Handling**:
- Server timeout: 30 seconds
- Client timeout: 35 seconds (slightly longer)
- Automatic reconnect on timeout

2. **Error Recovery**:
- Exponential backoff on errors
- Version reset on sync failure
- Full document reload as fallback

### Performance Optimization

1. **Snapshot Storage**:
- Keep only recent snapshots (e.g., last 100 versions)
- Periodic full snapshots for quick catchup
- Compress snapshots with zlib

2. **Diff Calculation**:
- Cache frequently requested diffs
- Batch multiple versions into single diff
- Use YJS native diff format

### Database Cleanup

```sql
-- Cleanup old snapshots (keep last 100 per project)
DELETE FROM project_snapshots
WHERE (project_id, version) NOT IN (
  SELECT project_id, version
  FROM project_snapshots
  WHERE project_id = $1
  ORDER BY version DESC
  LIMIT 100
);
```

## Migration Path

### Phase 1: Add Snapshot System
1. Create `project_snapshots` table
2. Add `current_version` to projects
3. Start saving snapshots on updates

### Phase 2: Implement Long Polling
1. Create `/updates` endpoint
2. Implement version-based diff
3. Add timeout handling

### Phase 3: Frontend Integration
1. Replace polling with long-poll hook
2. Handle connection management
3. Test error recovery

## Testing Strategy

1. **Unit Tests**:
- Version comparison logic
- Diff calculation
- Timeout handling

2. **Integration Tests**:
- Multi-client sync
- Network interruption recovery
- Version conflict resolution

3. **Load Tests**:
- Many concurrent long-polls
- Rapid update scenarios
- Memory usage monitoring

## Comparison with Previous Approach

| Aspect | Old (Client Polling) | New (Long Polling) |
|--------|---------------------|-------------------|
| Requests/min | 20-30 per client | 2 per client |
| Latency | 2-3 seconds | < 100ms |
| Server Load | High | Low |
| Complexity | Simple | Moderate |
| Real-time | No | Yes |