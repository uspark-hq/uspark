# Document Sharing Specification (MVP)

## Overview

Enable users to create shareable links for their documents, allowing external users to view content without authentication.

## User Flow

1. User clicks "Share" button on document viewer
2. System generates unique share link
3. User copies link and sends to others
4. Recipients open link to view document

## Implementation

### Database Schema

```sql
CREATE TABLE share_links (
  id VARCHAR(255) PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  project_id VARCHAR(255) REFERENCES projects(id),
  file_path VARCHAR(255), -- NULL means entire project
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP
);

CREATE INDEX idx_share_token ON share_links(token);
```

### API Endpoints

#### 1. Create Share Link

```typescript
POST /api/share
Body: {
  project_id: string,
  file_path?: string  // Optional, omit to share entire project
}
Returns: {
  id: string,
  url: string,  // Full shareable URL
  token: string
}
```

#### 2. Access Shared Content

```typescript
GET /api/share/:token
Returns: {
  project_name: string,
  file_path?: string,
  files?: Array<{ path, type }>,  // If sharing project
  content?: string  // If sharing single file
}
```

#### 3. List User's Share Links

```typescript
GET /api/share
Returns: {
  shares: Array<{
    id, 
    project_name, 
    file_path, 
    url,
    created_at,
    accessed_count
  }>
}
```

#### 4. Delete Share Link

```typescript
DELETE /api/share/:id
Returns: { success: boolean }
```

### Frontend Components

#### Share Button

Location: Document viewer toolbar

```tsx
interface ShareButtonProps {
  projectId: string;
  filePath?: string;
}

// Shows share icon
// On click: calls API and shows modal with link
```

#### Share Modal

```tsx
// Display generated link
// Copy button
// Shows "Link copied!" feedback
```

#### Public View Page

**Route**: `/share/:token`

Features:
- No authentication required
- Read-only document viewer
- Project name in header
- File explorer if sharing project
- Single file view if sharing file

### Implementation Todos

#### 1. Backend APIs
**Acceptance Criteria**:
- [x] POST /api/share - Generate share link (✅ PR #101)
- [x] GET /api/share/:token - Retrieve shared content (✅ PR #101, ⚠️ 需要 Blob 集成)
- [ ] GET /api/share - List user's shares (延期到下个迭代)
- [ ] DELETE /api/share/:id - Revoke share link (延期到下个迭代)

#### 2. Database Setup
**Acceptance Criteria**:
- [x] Create share_links table (✅ PR #102)
- [x] Add indexes for performance (✅ PR #102)

#### 3. Frontend Share Feature
**Acceptance Criteria**:
- [x] Share button in document viewer (✅ PR #106)
- [x] Share modal with copy functionality (✅ PR #106)
- [ ] Share management page at /settings/shares (延期到下个迭代)

#### 4. Public View Page
**Acceptance Criteria**:
- [x] Public route at /share/:token (✅ PR #106)
- [x] Read-only document viewer (✅ PR #106)
- [x] No authentication required (✅ PR #106)
- [x] Mobile responsive layout (✅ PR #106)

## Security Considerations (MVP)

- Use cryptographically secure random tokens
- No expiration for MVP
- No password protection for MVP
- Track access count for basic analytics