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