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

**API**:
```typescript
GET /api/projects/:id/files
Returns: { files: Array<{ path, type, size }> }

GET /api/projects/:id/file?path=<path>
Returns: { content: string }
```

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

**Real-time Updates**:
- WebSocket connection for live updates
- Show file changes as they happen
- Display execution logs

## Implementation Todos

### Backend APIs

#### 1. Project Management APIs
**Acceptance Criteria**:
- [ ] GET /api/projects - List user's projects
- [ ] POST /api/projects - Create new project
- [ ] GET /api/projects/:id/files - Get file tree
- [ ] GET /api/projects/:id/file - Get file content

#### 2. Claude Execution APIs
**Acceptance Criteria**:
- [ ] POST /api/claude/execute - Start Claude task
- [ ] GET /api/claude/status/:taskId - Get task status
- [ ] WebSocket endpoint for real-time updates

### Frontend Pages

#### 3. Project List Page
**Acceptance Criteria**:
- [ ] Display projects grid/list
- [ ] Create project dialog
- [ ] Navigation to project detail

#### 4. Project Detail Page
**Acceptance Criteria**:
- [ ] File explorer component
- [ ] Document viewer with syntax highlighting
- [ ] Chat input component
- [ ] Real-time update display

#### 5. Real-time Integration
**Acceptance Criteria**:
- [ ] WebSocket client setup
- [ ] Live file change updates
- [ ] Execution status updates

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
- Socket.io or native WebSocket for real-time updates