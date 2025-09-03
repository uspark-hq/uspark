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

## Client Architecture Design

### Simplified FileSystem Extension Approach

The client-side synchronization is implemented by extending the existing `FileSystem` class with remote sync capabilities, avoiding the complexity of separate coordinator classes.

### Extended FileSystem Class

```typescript
export class FileSystem {
  private ydoc: Y.Doc;
  private files: Y.Map<FileNode>;
  private blobs: Y.Map<BlobInfo>;
  private blobStore: BlobStore;

  // Existing methods
  async writeFile(path: string, content: string): Promise<void>
  readFile(path: string): string

  // New sync methods
  async syncFromRemote(projectId: string): Promise<void> {
    // Fetch complete YDoc state from GET /api/projects/:projectId
    // Apply remote state to local ydoc using Y.applyUpdate
  }

  async syncToRemote(projectId: string): Promise<void> {
    // Generate incremental update using Y.encodeStateAsUpdate
    // Send to PATCH /api/projects/:projectId
  }

  async pullFile(projectId: string, filePath: string): Promise<void> {
    // 1. Sync from remote to get latest YDoc state
    // 2. Read file content from ydoc using existing readFile logic
    // 3. Write to local filesystem using fs.writeFile
  }

  async pushFile(projectId: string, filePath: string): Promise<void> {
    // 1. Read from local filesystem using fs.readFile
    // 2. Update ydoc using existing writeFile method
    // 3. Sync to remote
  }
}
```

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

## Implementation Todos - Client-First Approach

### Phase 1: Mock Server Setup (Testing Foundation)

#### 1. Create MockYjsServer for testing

**Task**: Build test infrastructure with real YJS integration
**Acceptance Criteria**:
- [ ] Implement MockYjsServer class managing multiple project Y.Doc instances
- [ ] Handle GET /api/projects/:projectId returning Y.encodeStateAsUpdate(ydoc)
- [ ] Handle PATCH /api/projects/:projectId applying updates with Y.applyUpdate
- [ ] Set up MSW request handlers for HTTP mocking
- [ ] Support multiple concurrent project states for testing

#### 2. Configure test environment

**Task**: Set up testing infrastructure for client sync
**Acceptance Criteria**:
- [ ] Configure MSW in vitest setup files
- [ ] Create test helpers for MockYjsServer interactions
- [ ] Set up temporary filesystem utilities for file operations
- [ ] Configure test isolation with beforeEach/afterEach cleanup

### Phase 2: CLI Implementation

#### 3. Extend FileSystem class with sync methods

**Task**: Add remote synchronization methods to existing FileSystem class
**Acceptance Criteria**:
- [ ] Add `syncFromRemote(projectId)` method to fetch and apply remote YDoc state
- [ ] Add `syncToRemote(projectId)` method to send local YDoc updates
- [ ] Add `pullFile(projectId, filePath)` method combining sync + local file write
- [ ] Add `pushFile(projectId, filePath)` method combining local file read + sync
- [ ] Use existing hash computation and blob storage logic

#### 4. Implement uspark CLI commands

**Task**: Add pull/push commands using extended FileSystem
**Acceptance Criteria**:
- [ ] Add `uspark pull <filePath> --project-id <id>` command
- [ ] Add `uspark push <filePath> --project-id <id>` command
- [ ] Instantiate FileSystem with appropriate BlobStore
- [ ] Handle basic command argument parsing
- [ ] Integrate with existing CLI framework

### Phase 3: Client Testing with Mock Server

#### 5. Mock YJS Server Implementation

**Task**: Create test server that uses real YJS for state management
**Acceptance Criteria**:
- [ ] Implement MockYjsServer class with internal Y.Doc instance
- [ ] Mock GET /api/projects/:projectId returning YDoc binary data
- [ ] Mock PATCH /api/projects/:projectId applying YDoc updates with real Y.applyUpdate
- [ ] Set up MSW handlers for HTTP request interception
- [ ] Store multiple project states in mock server

#### 6. FileSystem Sync Testing

**Task**: Test extended FileSystem sync methods
**Acceptance Criteria**:
- [ ] Test `pullFile()` with empty local and populated remote state
- [ ] Test `pushFile()` with local file changes
- [ ] Test YJS merge behavior when both sides have changes
- [ ] Test basic file content read/write to local filesystem
- [ ] Unit tests for new sync methods with mocked HTTP calls