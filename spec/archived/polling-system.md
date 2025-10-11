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
  snapshot BYTEA NOT NULL, -- Full YJS document state at this version
  diff BYTEA, -- YJS update operations from previous version (NULL for version 1)
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
  snapshot: Uint8Array; // Full YJS document state
  diff?: Uint8Array; // YJS update operations from version-1 to version
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

- **Headers:**
  - `Content-Type: application/octet-stream`
  - `X-From-Version: {fromVersion}`
  - `X-To-Version: {toVersion}`
  - `X-Has-More: true/false` (if client needs to fetch more updates)

- **Body:** Binary YJS update data (combined diffs)

```typescript
// Client applies the binary diff directly
const response = await fetch(`/api/projects/${projectId}/updates?version=${version}`);
const fromVersion = response.headers.get('X-From-Version');
const toVersion = response.headers.get('X-To-Version');
const diffBinary = await response.arrayBuffer();

// Apply to YJS document
Y.applyUpdate(doc, new Uint8Array(diffBinary));
```

#### Implementation

```typescript
// Backend API endpoint
async function getProjectUpdates(
  projectId: string,
  clientVersion: number,
  timeout: number = 30000
): Promise<Response> {
  const project = await db.projects.findById(projectId);

  // Client is behind - return diff immediately
  if (clientVersion < project.currentVersion) {
    // Collect all diffs from clientVersion to currentVersion
    const diffs = await db.projectSnapshots.findMany({
      projectId,
      version: { gt: clientVersion, lte: project.currentVersion }
    });

    // Combine all diff operations into single binary
    const updates = diffs
      .filter(s => s.diff)
      .map(s => s.diff!);

    // Merge multiple updates into one
    const mergedUpdate = Y.mergeUpdates(updates);

    return new Response(mergedUpdate, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-From-Version': clientVersion.toString(),
        'X-To-Version': project.currentVersion.toString(),
        'X-Has-More': 'false'
      }
    });
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
): Promise<Response> {
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

  // Timeout - return 204 No Content
  return new Response(null, { status: 204 });
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

          if (response.status === 204) {
            // No updates available (timeout)
            continue;
          }

          const toVersion = parseInt(response.headers.get('X-To-Version') || '0');
          const diffBinary = await response.arrayBuffer();

          if (diffBinary.byteLength > 0) {
            // Apply YJS update directly
            Y.applyUpdate(doc, new Uint8Array(diffBinary));
            setVersion(toVersion);
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
    // Get current project and snapshot
    const project = await tx.projects.findById(projectId);
    const previousSnapshot = project.currentVersion > 0
      ? await tx.projectSnapshots.findOne({
          projectId,
          version: project.currentVersion
        })
      : null;

    const newVersion = project.currentVersion + 1;

    // Apply update to get new full state
    const newDoc = new Y.Doc();
    if (previousSnapshot) {
      Y.applyUpdate(newDoc, previousSnapshot.snapshot);
    }
    Y.applyUpdate(newDoc, yjsUpdate);
    const newSnapshot = Y.encodeStateAsUpdate(newDoc);

    // Save new snapshot with diff
    await tx.projectSnapshots.create({
      projectId,
      version: newVersion,
      snapshot: newSnapshot,
      diff: yjsUpdate, // Store the actual update operations
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
- Store both full snapshot and diff for efficient sync
- Periodic consolidation: Every 50 versions, create a new base snapshot
- Compress snapshots and diffs with zlib

2. **Diff Retrieval**:
- No calculation needed - diffs are pre-stored
- Combine multiple diffs when client is many versions behind
- Direct YJS update operations, no conversion needed

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