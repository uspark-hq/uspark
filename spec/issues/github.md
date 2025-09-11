# GitHub Integration MVP Implementation Plan

## Core MVP Requirements

Based on `user_story_developer_local_sync.md`, the MVP needs:
1. **Connect GitHub account** - One-click OAuth authorization
2. **Create repository** - Auto-create `{workspace}-docs` repository  
3. **Web → GitHub sync** - Web edits automatically push to GitHub
4. **Basic conflict prevention** - Show sync status, prevent concurrent edits

### Task 1: Environment & Dependencies Setup
- **Goal**: Add GitHub environment variables and Octokit dependency
- **Files**: `apps/web/src/env.ts`, `apps/web/package.json`
- **Changes**:
  - Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY` (all optional)
  - Add `@octokit/rest` to dependencies
- **MVP Value**: Foundation for GitHub integration
- **PR Size**: ~15 lines

### Task 2: Database Schema
- **Goal**: Create tables for GitHub tokens and repositories
- **Files**: `apps/web/src/db/schema/github.ts`, `apps/web/src/db/db.ts`
- **Changes**:
  - `github_tokens` table (user_id, encrypted_access_token, scope)
  - `github_repos` table (project_id, repo_name, repo_id)
  - Add to schema exports
- **MVP Value**: Store GitHub connections and repo links
- **PR Size**: ~50 lines

### Task 3: Token Encryption & OAuth Flow
- **Goal**: GitHub OAuth authorization and secure token storage
- **Files**: 
  - `apps/web/src/lib/crypto.ts`
  - `apps/web/app/api/auth/github/route.ts`
  - `apps/web/app/api/auth/github/callback/route.ts`
- **Changes**:
  - AES-256-GCM token encryption
  - OAuth authorization endpoint (redirects to GitHub)
  - OAuth callback endpoint (stores encrypted token)
- **MVP Value**: Users can connect GitHub accounts securely
- **PR Size**: ~120 lines

### Task 4: GitHub Client & Status APIs
- **Goal**: GitHub API client and connection status endpoints
- **Files**:
  - `apps/web/src/lib/github/client.ts`
  - `apps/web/app/api/github/status/route.ts`
  - `apps/web/app/api/github/disconnect/route.ts`
- **Changes**:
  - Authenticated Octokit client creation
  - GET /api/github/status (connection status)
  - POST /api/github/disconnect (disconnect account)
- **MVP Value**: Check and manage GitHub connections
- **PR Size**: ~90 lines

### Task 5: Repository Creation
- **Goal**: Create and link GitHub repositories to projects
- **Files**:
  - `apps/web/src/lib/github/repository.ts`
  - `apps/web/app/api/projects/[projectId]/github/create/route.ts`
  - `apps/web/app/api/projects/[projectId]/github/status/route.ts`
- **Changes**:
  - createGitHubRepository function
  - POST /api/projects/:id/github/create (create repo)
  - GET /api/projects/:id/github/status (repo status)
- **MVP Value**: Auto-create `{workspace}-docs` repositories
- **PR Size**: ~120 lines

### Task 6: Basic Web → GitHub Sync
- **Goal**: Push document changes from web to GitHub
- **Files**:
  - Extend `apps/web/src/lib/github/repository.ts`
  - `apps/web/app/api/projects/[projectId]/github/sync/route.ts`
- **Changes**:
  - pushToGitHub function (create blobs, tree, commit)
  - POST /api/projects/:id/github/sync (manual sync)
  - Basic conflict checking (fail if remote ahead)
- **MVP Value**: Web edits automatically push to GitHub
- **PR Size**: ~100 lines

### Task 7: Simple Sync Lock
- **Goal**: Prevent concurrent sync operations
- **Files**: `apps/web/src/lib/github/sync.ts`
- **Changes**:
  - In-memory sync lock per project
  - acquireLock/releaseLock functions
  - Sync status tracking (syncing/idle)
- **MVP Value**: Basic conflict prevention
- **PR Size**: ~60 lines

### Task 8: Basic UI
- **Goal**: Minimal UI for GitHub integration
- **Files**: `apps/web/src/components/github-connection.tsx`
- **Changes**:
  - Simple connect/disconnect button
  - Connection status display
  - Repository creation button (for projects)
- **MVP Value**: Users can connect GitHub and create repos via UI
- **PR Size**: ~80 lines

## MVP Task Dependencies

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
```

- **Task 1-2**: Foundation (env vars, schema)
- **Task 3-4**: GitHub connection (OAuth, client)  
- **Task 5**: Repository creation
- **Task 6**: Web → GitHub sync
- **Task 7**: Conflict prevention
- **Task 8**: Basic UI

## MVP Success Criteria

✅ **After Task 8**: Users can connect GitHub, create repos, and sync documents from web to GitHub with basic conflict prevention.

## Implementation Notes

- **One task per PR** - Keep changes small and reviewable
- **Mock GitHub APIs** in tests - Don't hit real GitHub during testing
- **Security first** - Always encrypt tokens, validate inputs
- **Error handling** - Provide clear error messages to users

## Future Enhancements (Post-MVP)

- GitHub → Web sync (webhooks)
- Advanced conflict resolution
- Multiple repository support
- Branch management
- Automated sync triggers