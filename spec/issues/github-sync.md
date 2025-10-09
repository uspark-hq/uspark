# GitHub Synchronization Technical Specification

## Overview

This document describes the technical implementation of GitHub synchronization feature for MVP Story 1. It enables uSpark to sync project documents to user's existing GitHub repositories.

## Implementation Status

**Current State**: ✅ Fully Implemented - Creates Dedicated Repositories

The GitHub sync feature has been implemented to automatically create dedicated repositories for each project.

**What's Implemented**:
- ✅ Database: `github_repos` table with `last_sync_commit_sha` and `last_sync_at` columns
- ✅ Functions: `createProjectRepository()`, `syncProjectToGitHub()`, `checkGitHubStatus()` in `src/lib/github/`
- ✅ API: `/api/projects/[projectId]/github/sync` (POST for sync, GET for status)
- ✅ API: `/api/projects/[projectId]/github/repository` (POST to create repo, GET to get info)
- ✅ UI: `GitHubSyncButton` component in `app/components/github-sync-button.tsx`
- ✅ Tests: Comprehensive unit and integration tests

**Current Approach**:
- ✅ **Implementation**: Creates dedicated `uspark-{projectId}` repo with full mirror
- ✅ **Benefits**: Simple, isolated, no risk of overwriting user code

## Relation to MVP

This feature implements **Story 1: GitHub One-Way Synchronization (For Human Users)**.

**MVP Requirements**:
- ✅ One-way sync: uSpark → GitHub
- ✅ Auto-create **dedicated repository** for each project
- ✅ Repository name: `uspark-{projectId}`
- ✅ Full project mirror to dedicated repository
- ✅ Store commit SHA for sync state tracking

This provides a simple, isolated approach where each project gets its own documentation repository.

## Design Principles

### MVP Scope (Current)
- **Single Direction**: uSpark → GitHub (push only)
- **Target Repository**: User's existing code repository
- **Target Path**: `/spec` directory in the repository
- **Conflict Strategy**: Overwrite (no conflict detection)
- **Commit Tracking**: Store last sync commit SHA

## Architecture

### Data Model

```sql
-- Project GitHub sync configuration
CREATE TABLE project_github_sync (
  project_id UUID PRIMARY KEY REFERENCES projects(id),
  github_repo_owner VARCHAR(255) NOT NULL,
  github_repo_name VARCHAR(255) NOT NULL,

  -- Sync state (MVP)
  last_sync_commit_sha VARCHAR(40),
  last_sync_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Repository Structure

```
User's existing repository:
├── src/                    # User's code (untouched)
├── package.json            # User's config (untouched)
├── README.md               # User's docs (untouched)
└── spec/                   # uSpark managed directory
    ├── tasks/
    │   ├── feature-auth.md
    │   └── feature-api.md
    ├── architecture/
    │   └── decisions/
    │       ├── ADR-001.md
    │       └── ADR-002.md
    ├── progress/
    │   ├── 2025-01-15.md
    │   └── 2025-01-20.md
    └── debt/
        └── registry.md
```

## MVP Implementation

### Push Flow (uSpark → GitHub)

```typescript
async function pushToGitHub(projectId: string) {
  // 1. Get project configuration
  const config = await db
    .select()
    .from(projectGithubSync)
    .where(eq(projectGithubSync.projectId, projectId))
    .limit(1);

  const { githubRepoOwner, githubRepoName } = config[0];

  // 2. Get current GitHub HEAD
  const mainRef = await octokit.git.getRef({
    owner: githubRepoOwner,
    repo: githubRepoName,
    ref: 'heads/main'
  });

  const currentCommitSha = mainRef.data.object.sha;

  // 3. Optional: Detect external changes (warn user)
  if (config.lastSyncCommitSha &&
      currentCommitSha !== config.lastSyncCommitSha) {
    console.warn('External changes detected, will be overwritten');
  }

  // 4. Get all project files from uSpark
  const usparkFiles = await getProjectFiles(projectId);

  // 5. Create blobs for each file
  const tree = [];
  for (const file of usparkFiles) {
    const blob = await octokit.git.createBlob({
      owner: githubRepoOwner,
      repo: githubRepoName,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64'
    });

    tree.push({
      path: `spec/${file.path}`,
      mode: '100644',
      type: 'blob',
      sha: blob.data.sha
    });
  }

  // 6. Create tree (based on current commit, preserves other files)
  const newTree = await octokit.git.createTree({
    owner: githubRepoOwner,
    repo: githubRepoName,
    base_tree: currentCommitSha,
    tree
  });

  // 7. Create commit
  const newCommit = await octokit.git.createCommit({
    owner: githubRepoOwner,
    repo: githubRepoName,
    message: 'chore: sync specs from uSpark',
    tree: newTree.data.sha,
    parents: [currentCommitSha]
  });

  // 8. Update main branch
  await octokit.git.updateRef({
    owner: githubRepoOwner,
    repo: githubRepoName,
    ref: 'heads/main',
    sha: newCommit.data.sha
  });

  // 9. Store commit SHA (CRITICAL: enables future pull operations)
  await db
    .update(projectGithubSync)
    .set({
      lastSyncCommitSha: newCommit.data.sha,
      lastSyncAt: new Date()
    })
    .where(eq(projectGithubSync.projectId, projectId));

  return {
    success: true,
    commitSha: newCommit.data.sha,
    commitUrl: `https://github.com/${githubRepoOwner}/${githubRepoName}/commit/${newCommit.data.sha}`
  };
}
```

### External Change Detection

Even in MVP (push-only), we can detect external changes and warn users:

```typescript
async function checkGitHubStatus(projectId: string) {
  const config = await getProjectGithubSync(projectId);

  const mainRef = await octokit.git.getRef({
    owner: config.githubRepoOwner,
    repo: config.githubRepoName,
    ref: 'heads/main'
  });

  const currentHead = mainRef.data.object.sha;

  if (currentHead !== config.lastSyncCommitSha) {
    return {
      hasExternalChanges: true,
      message: "GitHub repository has been modified outside uSpark. Next push will overwrite these changes.",
      lastSyncCommit: config.lastSyncCommitSha,
      currentCommit: currentHead
    };
  }

  return {
    hasExternalChanges: false,
    lastSyncAt: config.lastSyncAt
  };
}
```

### API Endpoints

```typescript
// POST /api/projects/:id/github/push
export async function POST(req: Request) {
  const { projectId } = await req.json();

  // Check status first
  const status = await checkGitHubStatus(projectId);
  if (status.hasExternalChanges) {
    // Warn but allow push (overwrite strategy)
    console.warn('External changes will be overwritten');
  }

  const result = await pushToGitHub(projectId);
  return NextResponse.json(result);
}

// GET /api/projects/:id/github/status
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id: projectId } = params;
  const status = await checkGitHubStatus(projectId);
  return NextResponse.json(status);
}
```

## Key Design Decisions

### 1. Why Store Commit SHA in MVP?

Even though MVP only supports push, storing `last_sync_commit_sha` provides:

1. **Sync Verification**: Confirm push succeeded
2. **UI Display**: Show last sync time and commit link
3. **External Change Detection**: Warn users about external modifications
4. **Future-Proof**: Enables bidirectional sync in Post-MVP

### 2. Why Create Dedicated Repositories?

**Current Implementation**: Creates `uspark-{project.id}` dedicated repository

Rationale:
1. **Simplicity**: No need to manage existing repository structure
2. **Safety**: No risk of overwriting user's existing code or files
3. **Isolation**: Clear separation between uSpark docs and user code
4. **Control**: Full control over repository structure and content

This provides a straightforward approach for the initial MVP.

## Security Considerations

### GitHub App Permissions

Required permissions:
- **Contents**: Read and write access to repository contents
- **Metadata**: Read-only access to repository metadata

### Authentication

```typescript
// Use installation tokens (short-lived, per-repository)
const installationToken = await getInstallationToken(installationId);
const octokit = new Octokit({ auth: installationToken });
```

### Rate Limiting

GitHub API rate limits:
- **Authenticated**: 5,000 requests/hour
- **Installation tokens**: Same as authenticated

Mitigation:
- Cache file content when possible
- Batch operations
- Implement retry with exponential backoff

## Testing Strategy

### Integration Tests

```typescript
describe('GitHub Sync Integration', () => {
  it('pushes files to GitHub successfully', async () => {
    const projectId = await createTestProject();
    await addTestFiles(projectId);

    const result = await pushToGitHub(projectId);

    expect(result.success).toBe(true);
    expect(result.commitSha).toMatch(/^[0-9a-f]{40}$/);

    // Verify on GitHub
    const files = await getGitHubFiles(owner, repo, 'spec/');
    expect(files).toHaveLength(3);
  });

  it('detects external changes', async () => {
    const projectId = await createTestProject();
    await pushToGitHub(projectId);

    // Simulate external commit
    await createExternalCommit(owner, repo);

    const status = await checkGitHubStatus(projectId);
    expect(status.hasExternalChanges).toBe(true);
  });
});
```

## MVP Implementation Tasks

### Phase 1: Core Implementation ⚠️ Partially Complete
- [x] Update database schema to add `project_github_sync` table
  - Implemented as `github_repos` table with columns: `last_sync_commit_sha`, `last_sync_at`
  - Migration: `turbo/apps/web/src/db/migrations/0009_many_blob.sql`
- [x] Store `last_sync_commit_sha` after successful push
  - Updates `github_repos` table after successful sync (sync.ts:283-289)
- [x] Implement `checkGitHubStatus()` for external change detection
  - Implemented in `src/lib/github/sync.ts:305`
  - Compares current HEAD with last sync SHA
- [x] Add sync button with status indicator in project page
  - `GitHubSyncButton` component in `app/components/github-sync-button.tsx`
  - Shows sync status, loading states, and error messages
- [ ] ❌ Implement `pushToGitHub()` function with Git Trees API **correctly**
  - **Current Issue**: Implemented as `syncProjectToGitHub()` but creates dedicated repo instead of syncing to existing
  - **Required**: Must use `base_tree` parameter to preserve existing files
  - **Required**: Must prefix all paths with `spec/`
  - Location: `src/lib/github/sync.ts:194`
- [ ] ❌ Update GitHub settings UI to allow **selecting existing repository**
  - **Current Issue**: Only creates new dedicated repo `uspark-{projectId}`
  - **Required**: UI to select from user's existing repositories
  - Location: `app/components/github-sync-button.tsx`

### Phase 2: Testing & Validation ⚠️ Tests Exist But Test Wrong Behavior
- [x] Write integration tests for push flow
  - `src/lib/github/sync.test.ts` with 14 test cases
  - **Note**: Tests validate current (incorrect) behavior
- [x] Test external change detection
  - Test cases for SHA mismatch detection (sync.test.ts:348-394)
- [x] Validate with repositories of different sizes
  - Tests with multiple file counts (1, 2, 4 files)
- [x] Test error handling (rate limits, permissions, network failures)
  - Tests for unauthorized, not found, no files, blob storage errors
- [ ] ❌ Update tests to validate `/spec` directory behavior
  - Need to test that existing files outside `/spec` are preserved
  - Need to test that all synced files are under `spec/` prefix

### Phase 3: Complete MVP Implementation 🔄 Required to Match MVP Spec
- [ ] Add API to list user's existing repositories
  - Fetch from GitHub API using installation token
  - Filter by installation access
- [ ] Add UI for selecting existing repository
  - Dropdown/search to select from user's repos
  - Show repository details (owner/name, last updated)
  - Option to create new repo if needed
- [ ] Update sync logic to use `base_tree` parameter
  - Preserve user's existing files outside `/spec` directory
  - Only modify files under `spec/` path
- [ ] Prefix all file paths with `spec/`
  - Modify `createGitHubCommit()` to add `spec/` prefix
  - Ensure nested directory structure (e.g., `spec/tasks/feature-auth.md`)
- [ ] Update database schema if needed
  - May need to distinguish between "dedicated repo" vs "existing repo with /spec"
  - Store repository selection mode
- [ ] Update all tests to validate correct behavior
  - Test `/spec` directory isolation
  - Test preservation of existing files
  - Test path prefixing
- [ ] Deploy schema changes to production
- [ ] Monitor sync success rates
  - Add telemetry for sync operations
  - Track success/failure rates, error types
- [ ] Gather user feedback
  - Validate the `/spec` directory approach with users

## References

- [GitHub Git Data API](https://docs.github.com/en/rest/git)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Git Trees API](https://docs.github.com/en/rest/git/trees)
- [Compare Commits API](https://docs.github.com/en/rest/commits/commits#compare-two-commits)