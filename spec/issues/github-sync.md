# GitHub Synchronization Technical Specification

## Overview

This document describes the technical implementation of GitHub synchronization feature for MVP Story 1. It enables uSpark to sync project documents to user's existing GitHub repositories.

## Relation to MVP

This feature implements **Story 1: GitHub One-Way Synchronization (For Human Users)** with the following enhancement:

**MVP Current Implementation**:
- ✅ Creates dedicated repository (`uspark-{project.id}`)
- ✅ One-way sync: uSpark → GitHub

**MVP Enhancement** (This Spec):
- 🔄 Sync to **user's existing code repository** instead of creating new repo
- 🔄 Target path: `/specs` directory in existing repo
- 🔄 Store commit SHA for sync state tracking

This aligns with the **Solo Developer** user story where specs should live alongside the actual codebase.

## Design Principles

### MVP Scope (Current)
- **Single Direction**: uSpark → GitHub (push only)
- **Target Repository**: User's existing code repository
- **Target Path**: `/specs` directory in the repository
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
└── specs/                  # uSpark managed directory
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
      path: `specs/${file.path}`,
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

### 2. Why Sync to Existing Repo Instead of Creating New One?

**MVP Current**: Creates `uspark-{project.id}` repository
**MVP Enhancement**: Sync to user's existing code repository

Rationale:
1. **Natural Workflow**: Developers already have code repositories
2. **AI Tool Access**: Cursor/Claude Code can directly read `/specs` when opening project
3. **Version Control Unity**: Code and specs in same Git history
4. **Reduce Repository Fragmentation**: Avoid creating extra documentation repositories

This aligns with **user_story_developer_local_sync.md** where AI tools need consistent project context.

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
    const files = await getGitHubFiles(owner, repo, 'specs/');
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

### Phase 1: Core Implementation
- [ ] Update database schema to add `project_github_sync` table
- [ ] Implement `pushToGitHub()` function with Git Trees API
- [ ] Store `last_sync_commit_sha` after successful push
- [ ] Implement `checkGitHubStatus()` for external change detection
- [ ] Update GitHub settings UI to allow selecting existing repository
- [ ] Add sync button with status indicator in project page

### Phase 2: Testing & Validation
- [ ] Write integration tests for push flow
- [ ] Test external change detection
- [ ] Validate with repositories of different sizes
- [ ] Test error handling (rate limits, permissions, network failures)

### Phase 3: MVP Enhancement Deployment
- [ ] Deploy schema changes
- [ ] Enable feature for existing users (migration path from old `uspark-{id}` repos)
- [ ] Monitor sync success rates
- [ ] Gather user feedback

## References

- [GitHub Git Data API](https://docs.github.com/en/rest/git)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Git Trees API](https://docs.github.com/en/rest/git/trees)
- [Compare Commits API](https://docs.github.com/en/rest/commits/commits#compare-two-commits)