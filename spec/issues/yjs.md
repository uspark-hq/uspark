# YJS File System Data Structure

## Overview

This document defines the data structure for implementing a file system using YJS for real-time collaboration and Vercel Blob for binary storage.

## Core Data Structure

### YDoc Structure

```typescript
const ydoc = new Y.Doc();
const files = ydoc.getMap('files');  // path -> file metadata
const blobs = ydoc.getMap('blobs');  // hash -> content metadata
```

### Data Models

```typescript
// Path-specific information
interface FileNode {
  hash: string;    // Points to content
  mtime: number;   // Modified timestamp (path-specific)
}

// Content-specific information
interface BlobInfo {
  size: number;    // File size in bytes (content-specific)
  // Future extensible fields:
  // mimeType?: string;
  // encoding?: string;
  // compressed?: boolean;
}
```

## Design Principles

### Separation of Concerns

- **files Map**: Stores information related to **file paths**
  - Path is the key
  - Stores mutable, path-specific metadata
  - Each path points to content via hash

- **blobs Map**: Stores information related to **file content**
  - Content hash is the key
  - Stores immutable, content-specific metadata
  - Enables content deduplication across multiple paths

### Key Benefits

1. **Data Normalization**: No redundant storage of content metadata
2. **Efficient Deduplication**: Multiple paths can reference the same content
3. **Clean Separation**: Path metadata vs content metadata
4. **Performance**: O(1) lookups for both path and content information
5. **Extensibility**: Easy to add more metadata fields in the future

## API Design

### Core Synchronization APIs

The synchronization between client and server is handled through two primary endpoints that work with binary YDoc data.

#### GET /api/projects/:projectId

Returns the complete YDoc state as binary data.

**Request:**
```http
GET /api/projects/:projectId
Authorization: Bearer <token>
```

**Response:**
```http
200 OK
Content-Type: application/octet-stream

[Binary data: Y.encodeStateAsUpdate(ydoc)]
```

**Server Implementation:**
```typescript
// Load stored YDoc from database
const storedDoc = await db.query(
  "SELECT ydoc_data FROM projects WHERE id = $1 AND user_id = $2",
  [projectId, userId]
);

// Return binary data directly
return new Response(storedDoc.ydoc_data, {
  headers: { 'Content-Type': 'application/octet-stream' }
});
```

**Client Usage:**
```typescript
// Fetch and reconstruct YDoc
const response = await fetch(`/api/projects/${projectId}`);
const buffer = await response.arrayBuffer();
const ydoc = new Y.Doc();
Y.applyUpdate(ydoc, new Uint8Array(buffer));
```

#### PATCH /api/projects/:projectId

Accepts incremental YDoc updates and applies them to the stored document.

**Request:**
```http
PATCH /api/projects/:projectId
Authorization: Bearer <token>
Content-Type: application/octet-stream

[Binary data: Y.encodeStateAsUpdate(clientDoc, stateVector)]
```

**Response:**
```http
200 OK
```

**Server Implementation:**
```typescript
// Receive update from client
const update = new Uint8Array(await request.arrayBuffer());

// Load current YDoc from database
const storedDoc = await db.query(
  "SELECT ydoc_data, version FROM projects WHERE id = $1 AND user_id = $2",
  [projectId, userId]
);

// Reconstruct and apply update
const serverDoc = new Y.Doc();
Y.applyUpdate(serverDoc, new Uint8Array(storedDoc.ydoc_data));
Y.applyUpdate(serverDoc, update);

// Save updated state with optimistic locking
const newState = Y.encodeStateAsUpdate(serverDoc);
await db.query(
  "UPDATE projects SET ydoc_data = $1, version = version + 1 WHERE id = $2 AND version = $3",
  [Buffer.from(newState), projectId, storedDoc.version]
);
```

**Client Diff Generation:**
```typescript
// Get current server state
const stateVector = Y.encodeStateVector(ydoc);

// Make local changes
const files = ydoc.getMap('files');
files.set('path/to/file', { hash: 'abc123', mtime: Date.now() });

// Generate minimal diff
const update = Y.encodeStateAsUpdate(ydoc, stateVector);

// Send update to server
await fetch(`/api/projects/${projectId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: update
});
```

### Design Decisions

1. **Binary Protocol**: Direct use of YJS binary format for efficiency
2. **Stateless Server**: Server reconstructs YDoc on each request
3. **Incremental Updates**: PATCH sends only changes, not full state
4. **Optimistic Locking**: Version field prevents concurrent update conflicts

## Database Schema

### Projects Table

Stores serialized YDoc data for each project.

```sql
CREATE TABLE projects (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  ydoc_data BYTEA NOT NULL,        -- Serialized YDoc binary data
  version INTEGER DEFAULT 0,        -- Optimistic lock version
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_projects (user_id, id)
);
```

### Blob Storage

File contents are stored separately in Vercel Blob Storage, referenced by hash from the YDoc.

## Implementation Todos

### Phase 1: Backend API Setup

#### 1. Implement GET /api/projects/:projectId

**Task**: Create endpoint to retrieve complete YDoc state
**Acceptance Criteria**:
- [ ] Endpoint returns binary YDoc data with correct Content-Type
- [ ] Authenticates user and verifies project ownership
- [ ] Creates empty YDoc if project doesn't exist
- [ ] Handles database connection errors gracefully

#### 2. Implement PATCH /api/projects/:projectId

**Task**: Create endpoint to apply YDoc updates
**Acceptance Criteria**:
- [ ] Accepts binary update data in request body
- [ ] Loads current YDoc from database
- [ ] Applies update using Y.applyUpdate
- [ ] Implements optimistic locking with version field
- [ ] Returns 409 Conflict on version mismatch
- [ ] Updates timestamp on successful save

### Phase 2: CLI Implementation

#### 3. Implement uspark pull command

**Task**: Pull single file from remote YDoc
**Acceptance Criteria**:
- [ ] Parse --project-id and file path arguments
- [ ] Fetch complete YDoc from GET endpoint
- [ ] Extract file metadata from files Map
- [ ] Download blob content if needed
- [ ] Write file to local filesystem with correct path

#### 4. Implement uspark push command

**Task**: Push single file to remote YDoc
**Acceptance Criteria**:
- [ ] Parse --project-id and file path arguments
- [ ] Read local file and compute hash
- [ ] Upload blob content if new
- [ ] Generate YDoc update with new FileNode
- [ ] Send update via PATCH endpoint
- [ ] Handle conflict errors with retry

### Phase 3: Testing

#### 5. API Endpoint Testing

**Task**: Comprehensive test coverage for sync APIs
**Acceptance Criteria**:
- [ ] Unit tests for YDoc serialization/deserialization
- [ ] Integration tests for GET/PATCH endpoints
- [ ] Concurrent update conflict tests
- [ ] Binary data handling tests
- [ ] Authentication and authorization tests

#### 6. End-to-End Sync Testing

**Task**: Test complete pull/push workflows
**Acceptance Criteria**:
- [ ] Single file pull/push test
- [ ] Binary file handling test
- [ ] Large file test
- [ ] Network error recovery test