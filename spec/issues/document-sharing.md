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
- [ ] POST /api/share - Generate share link
- [ ] GET /api/share/:token - Retrieve shared content
- [ ] GET /api/share - List user's shares
- [ ] DELETE /api/share/:id - Revoke share link

#### 2. Database Setup
**Acceptance Criteria**:
- [ ] Create share_links table
- [ ] Add indexes for performance

#### 3. Frontend Share Feature
**Acceptance Criteria**:
- [ ] Share button in document viewer
- [ ] Share modal with copy functionality
- [ ] Share management page at /settings/shares

#### 4. Public View Page
**Acceptance Criteria**:
- [ ] Public route at /share/:token
- [ ] Read-only document viewer
- [ ] No authentication required
- [ ] Mobile responsive layout

## Security Considerations (MVP)

- Use cryptographically secure random tokens
- No expiration for MVP
- No password protection for MVP
- Track access count for basic analytics