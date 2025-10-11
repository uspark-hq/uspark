# Story 3: Project Onboarding from GitHub Repository

## User Story

**As a** technical CEO/founder or developer with an existing codebase
**I want to** connect my GitHub repository and automatically generate initial project documentation
**So that** I can quickly start managing my AI coding workflow without manual documentation setup

## User Flow

1. User clicks "Create New Project"
2. User enters project name
3. User selects a GitHub repository from their connected account
4. User clicks "Create Project"
5. Project is created and user enters project detail page
6. User sees background analysis in progress: "Analyzing your codebase... (this may take 2-5 minutes)"
7. When analysis completes, user sees generated documents:
   - Architecture specification
   - Suggested tasks
   - Identified technical debt
8. User can review and edit the generated content directly in the document viewer
9. Documents are automatically saved as user edits

## Acceptance Criteria

- [ ] Repository selection UI during project creation
- [ ] GitHub repository access via GitHub App integration
- [ ] Automatic repository clone in E2B container
- [ ] Claude-powered initial scan that analyzes:
  - Project structure and architecture
  - Tech stack and dependencies
  - Existing documentation (README, docs/)
  - Code complexity and patterns
- [ ] Auto-generation of initial documents from templates:
  - `spec.md` - Architecture and feature overview
  - `tasks.md` - Suggested improvement tasks
  - `tech-debt.md` - Identified technical debt
- [ ] Progress indicators during scan (estimated 2-5 minutes)
- [ ] Review/edit screen (documents appear in normal editor)
- [ ] Fallback to empty templates if scan fails

## Implementation Plan

### Phase 1: Database Schema & Types

#### 1.1 Update Projects Schema
**File**: `turbo/apps/web/src/db/schema/projects.ts`

Add fields:
```typescript
sourceRepoUrl: text | null          // Format: "owner/repo"
sourceRepoInstallationId: integer | null  // For GitHub access
initialScanStatus: text | null      // 'pending' | 'running' | 'completed' | 'failed' | null
initialScanSessionId: text | null   // Links to scanning session
```

#### 1.2 Database Migration
- Create migration for new columns
- Existing projects: set new fields to null

#### 1.3 Update Contracts
**File**: `turbo/packages/core/src/contracts/projects.contract.ts`

- Add to `CreateProjectRequestSchema`: optional `sourceRepoUrl`, `installationId`
- Update response schemas to include new fields

### Phase 2: GitHub Repository Selection

#### 2.1 List User Repositories API
**New File**: `turbo/apps/web/app/api/github/repositories/route.ts`

- GET endpoint listing repos from all user installations
- Use Octokit to fetch repositories across installations
- Return: `{ repositories: [{ id, name, fullName, installationId, private, url }] }`
- Filter by user's installation access

#### 2.2 Update Project Creation API
**File**: `turbo/apps/web/app/api/projects/route.ts`

Changes:
- Accept optional `sourceRepoUrl` and `installationId` in POST body
- Validate user has installation access
- Store in database with `initialScanStatus: 'pending'`
- Trigger initial scan asynchronously (don't wait for completion)

### Phase 3: Initial Scan Backend

#### 3.1 Initial Scan Prompt Template
**New File**: `turbo/apps/web/src/lib/prompts/initial-scan.ts`

Generate prompt that instructs Claude to:

1. **Clone repository**:
   ```bash
   git clone https://$GITHUB_TOKEN@github.com/{owner}/{repo}.git $HOME/repo
   ```

2. **Analyze codebase** at `$HOME/repo`:
   - Project structure and organization
   - Tech stack (languages, frameworks, dependencies)
   - Architecture patterns
   - Key features and functionality
   - Code quality issues

3. **Generate three documentation files** (auto-synced via watch-claude):
   - `spec.md`: Architecture overview, tech stack, features
   - `tasks.md`: Suggested improvements and enhancements
   - `tech-debt.md`: Technical debt analysis

Example implementation:
```typescript
export function generateInitialScanPrompt(
  repoOwner: string,
  repoName: string
): string {
  return `You are helping bootstrap a new uSpark project by analyzing an existing codebase.

**Step 1: Clone the repository**
Run this command (GITHUB_TOKEN is already set in environment):
\`\`\`bash
git clone https://$GITHUB_TOKEN@github.com/${repoOwner}/${repoName}.git $HOME/repo
\`\`\`

**Step 2: Analyze the codebase**
Review the repository at $HOME/repo:
- Project structure and file organization
- Tech stack (languages, frameworks, dependencies)
- Architecture patterns
- Key features and functionality
- Code quality and potential issues

**Step 3: Generate documentation files**
Create these files in the current working directory (they will auto-sync to uSpark):

1. **spec.md**: Project specification
   - Overview and purpose
   - Architecture design
   - Tech stack details
   - Key features list
   - API structure (if applicable)

2. **tasks.md**: Suggested improvement tasks
   - High-priority enhancements
   - Bug fix opportunities
   - Performance optimizations
   - Missing tests or documentation

3. **tech-debt.md**: Technical debt analysis
   - Deprecated dependencies
   - Code complexity issues
   - Security concerns
   - Outdated patterns

The watch-claude process will automatically sync these files to uSpark when you're done.`;
}
```

#### 3.2 Initial Scan Executor
**New File**: `turbo/apps/web/src/lib/initial-scan-executor.ts`

```typescript
export class InitialScanExecutor {
  /**
   * Start initial scan for a project
   * Creates a special session and triggers Claude execution
   */
  static async startScan(
    projectId: string,
    sourceRepoUrl: string, // "owner/repo"
    installationId: number,
    userId: string
  ): Promise<{ sessionId: string; turnId: string }> {
    initServices();
    const db = globalThis.services.db;

    // Parse repo URL
    const [owner, repo] = sourceRepoUrl.split('/');

    // Create session
    const sessionId = `sess_${randomUUID()}`;
    await db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: 'Initial Repository Scan',
    });

    // Create turn with scan prompt
    const turnId = `turn_${randomUUID()}`;
    const scanPrompt = generateInitialScanPrompt(owner, repo);

    await db.insert(TURNS_TBL).values({
      id: turnId,
      sessionId,
      userPrompt: scanPrompt,
      status: 'pending',
    });

    // Update project status
    await db.update(PROJECTS_TBL)
      .set({
        initialScanStatus: 'running',
        initialScanSessionId: sessionId,
      })
      .where(eq(PROJECTS_TBL.id, projectId));

    // Get GitHub token for cloning
    const githubToken = await getInstallationToken(installationId);

    // Execute via normal Claude executor
    // Pass GITHUB_TOKEN as environment variable for git clone
    await ClaudeExecutor.execute(
      turnId,
      sessionId,
      projectId,
      scanPrompt,
      userId,
      { GITHUB_TOKEN: githubToken } // Extra env vars
    );

    return { sessionId, turnId };
  }

  /**
   * Update project status when scan completes
   */
  static async onScanComplete(
    projectId: string,
    sessionId: string,
    success: boolean
  ): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    await db.update(PROJECTS_TBL)
      .set({
        initialScanStatus: success ? 'completed' : 'failed',
      })
      .where(
        and(
          eq(PROJECTS_TBL.id, projectId),
          eq(PROJECTS_TBL.initialScanSessionId, sessionId)
        )
      );
  }
}
```

#### 3.3 Update E2BExecutor
**File**: `turbo/apps/web/src/lib/e2b-executor.ts`

Modifications:
- Add optional `extraEnvs` parameter to `getSandboxForSession`
- Merge `extraEnvs` with default environment variables
- Pass to sandbox creation:

```typescript
const sandbox = await Sandbox.create(TEMPLATE_ID, {
  timeout: this.SANDBOX_TIMEOUT,
  metadata: { sessionId, projectId, userId },
  envs: {
    CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
    PROJECT_ID: projectId,
    ...extraEnvs, // e.g., GITHUB_TOKEN
  },
});
```

#### 3.4 Update ClaudeExecutor
**File**: `turbo/apps/web/src/lib/claude-executor.ts`

Modifications:
- Add optional `extraEnvs` parameter to `execute` method
- Pass through to E2BExecutor

```typescript
static async execute(
  turnId: string,
  sessionId: string,
  projectId: string,
  userPrompt: string,
  userId: string,
  extraEnvs?: Record<string, string>
): Promise<void>
```

#### 3.5 Scan Completion Detection
**File**: Integration into existing turn status update logic

When a turn completes:
1. Check if turn belongs to an initial scan session
2. If yes, call `InitialScanExecutor.onScanComplete()`
3. Update project `initialScanStatus` to 'completed' or 'failed'

#### 3.6 GitHub Token Helper
**File**: `turbo/apps/web/src/lib/github/auth.ts` or new helper

Add function:
```typescript
async function getInstallationToken(installationId: number): Promise<string> {
  const octokit = await createInstallationOctokit(installationId);
  // Return token for git clone authentication
  // Extract from octokit auth or use GitHub API
}
```

### Phase 4: Frontend Integration

#### 4.1 Repository Selector Component
**New File**: `turbo/apps/web/src/components/github-repo-selector.tsx`

Features:
- Fetches repositories from `/api/github/repositories`
- Dropdown grouped by installation/organization
- Shows public/private indicator
- Loading and error states
- "No repositories found" message with setup link

#### 4.2 Update Project Creation UI
**File**: Project creation page component

Updates:
- Add repository selector section (optional)
- "Skip initial scan" option for empty projects
- Handle form submission with optional repo selection
- Show loading state during creation
- Redirect to project detail page immediately

#### 4.3 Scan Status Banner Component
**New File**: `turbo/apps/web/src/components/initial-scan-banner.tsx`

Features:
- Display scan status: pending, running, completed, failed
- Progress message: "Analyzing repository... (this may take 2-5 minutes)"
- Link to scan session to view real-time progress
- Retry button for failed scans
- Dismissible after completion (stores in localStorage)

#### 4.4 Project Detail Page Integration
**File**: Project detail page component

Updates:
- Add scan status banner at top (conditionally shown based on `initialScanStatus`)
- Poll `project.initialScanStatus` via existing project detail polling
- Refresh file tree when status changes to 'completed'
- Link to scan session for real-time Claude output

### Phase 5: Testing & Documentation

#### 5.1 Update MVP Specification
**File**: `spec/issues/mvp.md`

Add Story 3:
- User story description
- Acceptance criteria
- User flow
- Technical requirements
- Implementation status
- Integration with existing stories

#### 5.2 Unit Tests

Test coverage:
- Prompt generation with various repo formats
- Initial scan executor session/turn creation
- Status update logic
- GitHub token retrieval
- Error handling for invalid repos

#### 5.3 Integration Tests

Test scenarios:
- Repository listing API with multiple installations
- Project creation with source repo
- Scan trigger and status updates
- Session completion hooks

#### 5.4 E2E Tests

Full flow tests:
- Complete onboarding from repo selection to scan completion
- Verify generated documents appear in file tree
- Edit generated documents
- Error scenarios:
  - Repository access denied
  - Clone timeout
  - Invalid repository URL
  - Scan failure and recovery

#### 5.5 Error Handling

Graceful degradation for:
- **Repository access denied**: Clear error message, option to continue without scan
- **Clone timeout**: Retry mechanism with user notification
- **Claude execution failure**: Fallback to empty project, preserve user choice
- **Network errors**: Retry with exponential backoff
- **Large repositories**: Set timeout limits, suggest manual documentation

## Technical Requirements

### Existing Infrastructure (Reused)
- ✅ GitHub App integration (Story 1)
- ✅ E2B container setup (Story 1b)
- ✅ Claude Code execution (Story 2)
- ✅ Session polling (Story 2)
- ✅ YJS document sync (Story 2)
- ✅ watch-claude command (Story 1b)

### New Components
- Initial scan prompt templates
- Repository listing API
- Scan status tracking
- GitHub token passing to E2B
- Frontend repository selector
- Scan status UI components

## Key Architecture Decisions

✅ **Reuse session infrastructure**: Scan is just a special session type with a structured prompt

✅ **Environment variable pattern**: Pass `GITHUB_TOKEN` via sandbox environment variables for git clone

✅ **Existing sync mechanism**: `watch-claude` automatically syncs generated files back to uSpark

✅ **Standard polling**: Use existing session status polling for scan progress updates

✅ **Minimal code changes**: Only add prompt generation and trigger logic, no E2B executor changes needed

✅ **Separate repositories**:
- Source repo (user's existing codebase, read-only for scanning)
- uSpark sync repo (where uSpark documents are pushed, Story 1)

✅ **Async execution**: Project creation returns immediately, scan runs in background

## Out of Scope for MVP

- Multi-repository projects
- Incremental updates to initial scan
- Custom template creation
- Monorepo sub-project selection
- Re-scanning after repository changes
- Interactive scan configuration

## Success Criteria

- User can select GitHub repo during project creation
- Scan generates meaningful spec, tasks, and tech-debt documents
- Generated documents are immediately editable after scan completes
- Graceful fallback if scan fails (empty project still usable)
- All existing features continue working unchanged
- Scan completes within 10 minutes for typical repositories
- Clear progress indicators and error messages

## Dependencies

### External Dependencies
- GitHub API for repository listing
- GitHub App token for private repo access
- E2B platform availability
- Claude API for analysis

### Internal Dependencies
- Story 1: GitHub App integration ✅
- Story 1b: E2B container with uSpark CLI ✅
- Story 2: Claude execution and session management ✅

## Implementation Status

- [ ] Phase 1: Database Schema & Types
- [ ] Phase 2: GitHub Repository Selection
- [ ] Phase 3: Initial Scan Backend
- [ ] Phase 4: Frontend Integration
- [ ] Phase 5: Testing & Documentation
