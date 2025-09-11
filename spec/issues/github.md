# GitHub Integration MVP Implementation Plan

## GitHub App Approach

We're using GitHub Apps (not OAuth Apps) for better security and user experience:
- **Better UX**: Users install the app once, select repositories
- **Granular permissions**: Fine-grained repository access control
- **Organization support**: Works seamlessly with org accounts
- **No secrets in env**: App credentials managed separately
- **Webhook built-in**: Automatic webhook setup on installation

## Core MVP Requirements

Based on `user_story_developer_local_sync.md`, the MVP needs:
1. **Install GitHub App** - One-click GitHub App installation
2. **Create repository** - Auto-create `uspark-{project.id}` repository  
3. **Web → GitHub sync** - Web edits automatically push to GitHub
4. **Basic conflict prevention** - Show sync status, prevent concurrent edits

### Task 1: GitHub App Setup & Dependencies
- **Goal**: Create GitHub App and add Octokit dependency
- **Files**: `apps/web/src/env.ts`, `apps/web/package.json`
- **Changes**:
  - Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET` (all optional)
  - Add `@octokit/app` and `@octokit/webhooks` to dependencies
- **MVP Value**: Foundation for GitHub App integration
- **PR Size**: ~20 lines

### Task 2: Database Schema
- **Goal**: Create tables for GitHub App installations and repositories
- **Files**: `apps/web/src/db/schema/github.ts`, `apps/web/src/db/db.ts`
- **Changes**:
  - `github_installations` table (user_id, installation_id, account_name)
  - `github_repos` table (project_id, repo_name, repo_id, installation_id)
  - Add to schema exports
- **MVP Value**: Store GitHub App installations and repo links
- **PR Size**: ~50 lines

### Task 3: GitHub App Installation Flow
- **Goal**: Handle GitHub App installation and setup
- **Files**: 
  - `apps/web/app/api/github/install/route.ts`
  - `apps/web/app/api/github/callback/route.ts`
  - `apps/web/app/api/github/webhook/route.ts`
- **Changes**:
  - Installation redirect endpoint
  - Installation callback handler
  - Webhook endpoint for installation events
- **MVP Value**: Users can install GitHub App on their account/org
- **PR Size**: ~100 lines

### Task 4: GitHub App Client & Status APIs
- **Goal**: GitHub App API client and installation status endpoints
- **Files**:
  - `apps/web/src/lib/github/app.ts`
  - `apps/web/app/api/github/installations/route.ts`
  - `apps/web/app/api/github/uninstall/route.ts`
- **Changes**:
  - GitHub App client with installation tokens
  - GET /api/github/installations (list installations)
  - POST /api/github/uninstall (remove installation)
- **MVP Value**: Manage GitHub App installations
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
- **MVP Value**: Auto-create `uspark-{project.id}` repositories
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
- **Goal**: Minimal UI for GitHub App integration
- **Files**: `apps/web/src/components/github-installation.tsx`
- **Changes**:
  - Install/manage GitHub App button
  - Installation status display
  - Repository creation button (for projects)
- **MVP Value**: Users can install GitHub App and create repos via UI
- **PR Size**: ~80 lines

## MVP Task Dependencies

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
```

- **Task 1-2**: Foundation (env vars, schema)
- **Task 3-4**: GitHub App setup (installation, client)  
- **Task 5**: Repository creation
- **Task 6**: Web → GitHub sync
- **Task 7**: Conflict prevention
- **Task 8**: Basic UI

## MVP Success Criteria

✅ **After Task 8**: Users can install GitHub App, create repos named `uspark-{project.id}`, and sync documents from web to GitHub with basic conflict prevention.

## Implementation Notes

- **One task per PR** - Keep changes small and reviewable
- **Mock GitHub APIs** in tests - Don't hit real GitHub during testing
- **Security first** - Validate webhook signatures, secure private keys
- **Error handling** - Provide clear error messages to users

## Future Enhancements (Post-MVP)

- GitHub → Web sync (webhooks)
- Advanced conflict resolution
- Multiple repository support
- Branch management
- Automated sync triggers