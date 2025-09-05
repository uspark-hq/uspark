# YJS File System Data Structure (MVP)

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

### Direct Blob Storage Access

Clients (CLI and Web) directly access Vercel Blob Storage for file content, while YJS only stores metadata and file structure. This reduces server load and improves transfer performance.

### Upload Flow
```
1. Client requests STS token from API server
2. Client uploads file content directly to Vercel Blob Storage
3. Client updates YJS with file metadata (hash, size)
4. Client sends PATCH to sync YJS state
```

### Download Flow
```
1. Client fetches YJS state from API server
2. Client extracts file hash from YJS metadata
3. Client downloads file content directly from Vercel Blob Storage using STS token
```

### Extended FileSystem Class

```typescript
export class FileSystem {
  private ydoc: Y.Doc;
  private files: Y.Map<FileNode>;
  private blobs: Y.Map<BlobInfo>;
  private blobStore: VercelBlobClient;

  // Get STS token for direct blob access
  async getBlobToken(projectId: string): Promise<BlobToken> {
    const response = await fetch(`/api/projects/${projectId}/blob-token`);
    return response.json(); // { token, expiresAt, uploadUrl, downloadUrlPrefix }
  }

  async pullFile(projectId: string, filePath: string): Promise<void> {
    // 1. Sync YJS state from remote
    await this.syncFromRemote(projectId);
    
    // 2. Get file metadata from YJS
    const fileNode = this.files.get(filePath);
    if (!fileNode) throw new Error('File not found');
    
    // 3. Get STS token for blob access
    const { token, downloadUrlPrefix } = await this.getBlobToken(projectId);
    
    // 4. Download content directly from Vercel Blob
    const content = await fetch(`${downloadUrlPrefix}/${fileNode.hash}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // 5. Write to local filesystem
    await fs.writeFile(filePath, await content.text());
  }

  async pushFile(projectId: string, filePath: string): Promise<void> {
    // 1. Read local file
    const content = await fs.readFile(filePath, 'utf8');
    const hash = calculateHash(content);
    
    // 2. Get STS token for blob access
    const { token, uploadUrl } = await this.getBlobToken(projectId);
    
    // 3. Upload directly to Vercel Blob if not exists
    if (!this.blobs.has(hash)) {
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-blob-hash': hash
        },
        body: content
      });
    }
    
    // 4. Update YJS with metadata
    this.files.set(filePath, { hash, mtime: Date.now() });
    this.blobs.set(hash, { size: content.length });
    
    // 5. Sync YJS state to remote
    await this.syncToRemote(projectId);
  }
}
```

## API Design

### Core Synchronization APIs

The synchronization between client and server is handled through YDoc synchronization endpoints and a blob token endpoint for direct storage access.

#### GET /api/projects/:projectId/blob-token

Returns temporary STS token for direct Vercel Blob Storage access.

**Request:**
```http
GET /api/projects/:projectId/blob-token
Authorization: Bearer <token>
```

**Response:**
```json
{
  "token": "vercel_blob_rw_abc123...",
  "expiresAt": "2024-01-01T12:30:00Z",
  "uploadUrl": "https://blob.vercel-storage.com/upload",
  "downloadUrlPrefix": "https://blob.vercel-storage.com/files"
}
```

**Server Implementation:**
```typescript
// Generate STS token with limited lifetime (e.g., 10 minutes)
const stsToken = await vercelBlob.generateStsToken({
  projectId,
  permissions: ['read', 'write'],
  expiresIn: 600 // 10 minutes
});

return Response.json({
  token: stsToken.token,
  expiresAt: stsToken.expiresAt,
  uploadUrl: process.env.VERCEL_BLOB_UPLOAD_URL,
  downloadUrlPrefix: process.env.VERCEL_BLOB_DOWNLOAD_URL
});
```

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
**Note**: Vercel Blob storage implementation with content-addressed deduplication completed (PR #80)

#### Direct Client Access
- Clients receive STS tokens for direct blob access
- Upload: Client → Vercel Blob → Update YJS
- Download: YJS metadata → Vercel Blob → Client
- Reduces server bandwidth and improves performance

## Implementation Todos - Client-First Approach

### Phase 1: Mock Server Setup (Testing Foundation)

#### 1. Create MockYjsServer for testing

**Task**: Build test infrastructure with real YJS integration
**Acceptance Criteria**:
- [x] Implement MockYjsServer class managing multiple project Y.Doc instances
- [x] Handle GET /api/projects/:projectId returning Y.encodeStateAsUpdate(ydoc)
- [x] Handle PATCH /api/projects/:projectId applying updates with Y.applyUpdate
- [x] Set up MSW request handlers for HTTP mocking
- [x] Support multiple concurrent project states for testing

#### 2. Configure test environment

**Task**: Set up testing infrastructure for client sync
**Acceptance Criteria**:
- [x] Configure MSW in vitest setup files
- [x] Create test helpers for MockYjsServer interactions
- [x] Set up temporary filesystem utilities for file operations
- [x] Configure test isolation with beforeEach/afterEach cleanup

### Phase 2: CLI Implementation

#### 3. Blob Token API Implementation

**Task**: Add STS token endpoint for direct blob access
**Acceptance Criteria**:
- [ ] Implement GET /api/projects/:projectId/blob-token endpoint (🔄 进行中 - 任务 9)
- [ ] Generate time-limited STS tokens (10 minutes) (🔄 进行中 - 任务 9)
- [ ] Include upload/download URLs in response (🔄 进行中 - 任务 9)
- [ ] Validate user has project access (🔄 进行中 - 任务 9)

#### 4. Extend FileSystem class with direct blob access

**Task**: Update FileSystem to use direct Vercel Blob access
**Note**: FileSystem has been moved to CLI package (PR #85)
**Acceptance Criteria**:
- [ ] Add `getBlobToken()` method to request STS token (🔄 进行中 - 任务 9)
- [ ] Update `pullFile()` to download directly from Vercel Blob (🔄 进行中 - 任务 9)
- [ ] Update `pushFile()` to upload directly to Vercel Blob (🔄 进行中 - 任务 9)
- [ ] Keep YJS sync for metadata only (待开始)

#### 5. Implement uspark CLI commands

**Task**: Add pull/push commands using extended FileSystem
**Acceptance Criteria**:
- [x] Add `uspark pull <filePath> --project-id <id>` command (✅ 已完成)
- [ ] Add `uspark push <filePath> --project-id <id>` command (🔄 进行中 - 任务 1)
- [ ] Add `uspark push --all --project-id <id>` command (🔄 进行中 - 任务 1)
- [x] Integrate with existing CLI framework (✅ 已完成)

