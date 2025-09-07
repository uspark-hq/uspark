# Web UI Specification (MVP)

## Overview

Web interface for viewing projects, browsing documents, and executing Claude Code commands via chat interface.

## Pages & Components

### 1. Project List Page

**Route**: `/projects`

**Features**:
- Display list of user's projects
- Create new project button
- Click to navigate to project detail

**API**:
```typescript
GET /api/projects
Returns: { projects: Array<{ id, name, created_at, updated_at }> }

POST /api/projects
Body: { name: string }
Returns: { id, name, created_at }
```

### 2. Project Detail Page

**Route**: `/projects/:id`

**Layout**:
```
+------------------+----------------------+
|  File Explorer   |   Document Viewer    |
|                  |                      |
|  - src/          |   [File Content]     |
|    - index.js    |                      |
|    - utils.js    |                      |
|                  |                      |
+------------------+----------------------+
|            Chat Input Box               |
+-----------------------------------------+
```

**Components**:

#### File Explorer
- Tree view of project files
- Click file to view content
- Show file icons

#### Document Viewer
- Display selected file content
- Syntax highlighting
- Read-only for MVP

#### Chat Input
- Text input for Claude prompts
- Send button
- Execution status indicator

**Client-side File Management**:
- File structure is parsed from YJS snapshot on client
- File content retrieved directly from Blob Storage
- No additional APIs needed (uses existing YJS sync endpoints)

### 3. Claude Execution

**API**:
```typescript
POST /api/claude/execute
Body: { 
  project_id: string,
  prompt: string 
}
Returns: { task_id: string }

GET /api/claude/status/:taskId
Returns: { 
  status: 'pending' | 'running' | 'completed' | 'failed',
  updates: Array<{ timestamp, message }> 
}
```

**Status Updates (Polling-based)**:
- Polling connection for live updates
- Show file changes via YJS polling
- Display execution logs via status polling

## Implementation Todos

### Backend APIs

#### 1. Project Management APIs
**Acceptance Criteria**:
- [x] GET /api/projects - List user's projects (✅ PR #99)
- [x] POST /api/projects - Create new project (✅ PR #99)
- [x] Use existing YJS sync endpoints for file data (GET/PATCH /api/projects/:id) (✅ 已实现)
- [x] Client-side parsing of file structure from YJS snapshot (✅ 已实现)

#### 2. Claude Execution APIs
**Acceptance Criteria**:
- [ ] POST /api/claude/execute - Start Claude task
- [ ] GET /api/claude/status/:taskId - Get task status
- [ ] Polling endpoints for status updates

### Frontend Pages

#### 3. Project List Page
**Acceptance Criteria**:
- [x] Display projects grid/list (✅ PR #107)
- [x] Create project dialog (✅ 实现)
- [x] Navigation to project detail (✅ 实现)

#### 4. Project Detail Page
**Acceptance Criteria**:
- [x] File explorer component (✅ PR #107)
- [x] Document viewer with syntax highlighting (✅ PR #106)
- [ ] Chat input component (待实现)
- [ ] Polling-based update display (待实现)

#### 5. Polling Integration
**Acceptance Criteria**:
- [ ] Polling client setup (useSessionPolling hook)
- [ ] File change updates via YJS polling
- [ ] Execution status updates via API polling

## Database Schema

```sql
-- Projects table already exists in yjs.md
-- Only need to add claude_tasks table

CREATE TABLE claude_tasks (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  user_id VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  container_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

## Tech Stack

- Next.js App Router for pages
- Tailwind CSS for styling
- shadcn/ui for components
- Monaco Editor or CodeMirror for syntax highlighting
- Polling-based updates using existing API endpoints