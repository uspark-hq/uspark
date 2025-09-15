# MVP (Minimum Viable Product) Specification

## Overview

This document defines the mid-term goals and user stories for the MVP release of Uspark. The MVP focuses on validating the core technical pipeline: managing AI coding projects through structured documents (tasks, specs, technical debt) that are edited via Claude Code in E2B containers and synced to GitHub for use by external AI coding tools.

## User Stories

### Story 1: GitHub One-Way Synchronization (For Human Users)

**As a** technical CEO/founder or developer
**I want to** push uSpark documents to GitHub repositories
**So that** AI coding tools can access project context and specs from the repository

#### Acceptance Criteria

- [x] One-click GitHub App installation ✅
- [x] Automatic creation of dedicated repository (`uspark-{project.id}`) ✅
- [x] Web edits can be manually synced to GitHub via sync button ✅
- [x] Sync completes within 5 seconds ✅
- [x] Full file content pushed to GitHub ✅
- [x] Settings UI for GitHub connection management ✅
- [x] Sync status indicator showing last sync time ✅
- [x] Basic sync lock to prevent concurrent operations ✅

#### Technical Requirements

- GitHub App integration (not OAuth) for better security
- Git Trees API for efficient file uploads
- Installation token management
- Support for large documents (>1MB)
- UTF-8 encoding for all markdown files
- In-memory sync lock to prevent race conditions

#### Out of Scope for MVP

- GitHub → Web synchronization (future enhancement)
- Automatic sync on every edit (manual sync only)
- Conflict resolution (one-way sync avoids conflicts)
- Branch management (main branch only)
- Pull operations from GitHub

### Story 1b: uSpark CLI for E2B Container Synchronization (For AI Agents)

**As** Claude Code running in E2B container
**I want to** use uspark CLI to sync project files between container and uSpark
**So that** I can analyze and modify project management documents based on user prompts

#### Acceptance Criteria

- [x] `uspark pull --project-id <id>` downloads entire project to container ✅
- [x] `uspark push <file-path> --project-id <id>` uploads changes immediately ✅
- [x] `uspark watch-claude` monitors Claude output and syncs file changes ✅
- [x] Authentication via environment variable (USPARK_TOKEN) ✅
- [x] E2B container pre-configured with Claude Code CLI ✅ (Basic Dockerfile)
- [ ] E2B container pre-configured with uspark CLI ❌ (Still needs installation)

#### Technical Requirements

- YJS-based synchronization protocol
- Vercel Blob storage for file content
- Real-time file change detection via watch-claude
- Container initialization scripts
- Status monitoring through JSON output parsing

### Story 2: Web-based AI Document Editing

**As a** technical founder/developer
**I want to** access my project documents in a web interface and use Claude Code via a chat input
**So that** I can generate tasks, technical specs, and manage my AI coding workflow

#### Acceptance Criteria

- [x] Web dashboard showing list of projects ✅
- [x] Document explorer showing project file tree ✅
- [x] Document viewer/editor for selected files ✅
- [x] Chat interface for entering Claude Code prompts ✅ (UI only)
- [ ] Execution status indicators (via polling) ❌
- [ ] Document updates as Claude makes changes (via YJS polling) ❌

#### Technical Requirements

- E2B container runtime for Claude Code execution
- Polling API for status updates
- YJS for document synchronization (polling-based)
- Queue system for managing Claude tasks
- Audit logging for all AI operations

### Story 3: Task Generation and AI Control (NEW MVP FOCUS)

**As a** technical founder using AI coding tools
**I want to** generate structured tasks with prompts that control Claude Code
**So that** I can orchestrate my AI coding workflow efficiently

#### Acceptance Criteria

- [ ] Predefined prompt templates for common tasks (e.g., "Analyze codebase", "Generate task breakdown")
- [ ] One-click prompt insertion into chat interface
- [ ] Task documents automatically created from AI responses
- [ ] Generated prompts optimized for Claude Code execution
- [ ] Progress tracking as tasks are completed

#### Technical Requirements

- Prompt template system with variable substitution
- Task document generation from Claude responses
- Integration between task documents and Claude execution
- Status tracking for task completion

## Implementation Priorities

### Phase 1: Core Infrastructure (Prerequisites)

1. ✅ YJS document synchronization API
2. ✅ Vercel Blob storage integration
3. ✅ Basic authentication system
4. ✅ CLI environment variable authentication
5. ✅ Blob STS token API for direct access

### Phase 2: Synchronization Features

#### Phase 2a: GitHub Integration (Story 1)

1. [x] GitHub App flow implementation ✅
2. [x] Repository creation API ✅
3. [x] Webhook endpoint for GitHub push events ✅
4. [x] Git operations wrapper for web edits ✅
5. [x] Conflict prevention mechanism ✅ (one-way sync)
6. [x] Sync status UI indicators ✅

#### Phase 2b: uSpark CLI for E2B (Story 1b)

1. ✅ Complete `uspark pull` command
2. ✅ Implement `uspark push` command
3. ✅ Implement `uspark watch-claude` command
4. ✅ Update FileSystem class for direct blob access
5. [ ] E2B container configuration with pre-installed CLI ❌
6. [ ] Container initialization scripts ❌

### Phase 3: Web Interface Foundation (Story 2 - Part 1)

1. ✅ Project management APIs (list, create, get files)
2. ✅ Project dashboard page
3. ✅ Document explorer component
4. ✅ Basic document viewer
5. ✅ File tree navigation

### Phase 4: AI Integration (Story 2 - Part 2)

1. [x] Claude execution API endpoints ✅ (Session APIs implemented)
2. [ ] E2B container setup and configuration ❌
3. [x] uspark watch-claude command implementation ✅
4. [ ] Claude Code runtime integration ❌
5. [x] Chat interface component ✅ (UI only, no backend integration)
6. [ ] Polling system for status updates ❌ (backend exists, frontend hook missing)
7. [ ] Document change detection via YJS polling ❌
8. [ ] AWS Bedrock STS token generation for E2B Claude Code tasks ❌

### Phase 5: Task Generation Pipeline (Story 3)

1. [ ] Prompt template library ("Analyze Architecture", "Break Down Feature", "Review Technical Debt")
2. [ ] Template variable system (project context injection)
3. [ ] Task document auto-generation from Claude responses
4. [ ] Task → Claude Code execution pipeline
5. [ ] Progress tracking system


## Technical Debt Status (Updated 2025-01-12)

✅ **All technical debt cleaned up!**
- Removed all unused files (PR #167, #168)
- Removed all unused dependencies (PR #177)
- Cleaned up all unused exports (PR #168, #177)
- All checks passing: lint, type-check, test, knip

## Technical Debt Acknowledgment

Areas where we accept temporary shortcuts for MVP:

1. **Security**: Basic authentication only, no 2FA
2. **Scalability**: Single-region deployment
3. **Monitoring**: Basic logging only
4. **Testing**: Focus on critical paths only
5. **Documentation**: API docs and basic user guide only

## Definition of Done

The MVP is considered complete when:

1. All three user stories are fully implemented
2. Core functionality passes QA testing
3. Documentation covers basic usage
4. System handles 10 concurrent users
5. Critical bugs are resolved
6. Deployment pipeline is operational

## Next Steps After MVP

Post-MVP priorities aligned with AI coding management:

1. **Task → Claude Code Pipeline Optimization**
   - Advanced prompt engineering for different AI tools
   - Task dependency management
   - Automated task sequencing

2. **Project Analysis Features**
   - Codebase architecture analysis
   - Technical debt scoring
   - Progress vs plan tracking

3. **Multi-Tool Support**
   - Cursor integration
   - Windsurf integration
   - GitHub Copilot Workspace integration

4. **Team Coordination**
   - Task assignment and tracking
   - Architecture consistency checks
   - Unified technical debt dashboard

## Implementation Status Summary (2025-01-13)

### Overall Completion: ~65%

#### ✅ Completed Features (Working)
- **Story 1 (GitHub)**: 100% - All MVP requirements completed ✅
- **Story 1b (CLI)**: 85% - All CLI commands working, E2B container partially configured
- **Story 3 (Task Generation)**: 0% - New focus, not yet implemented

#### 🟡 Partially Completed
- **Story 2 (Web UI)**: 65% - UI complete, Claude sessions schema done, APIs missing
- **Phase 4 (AI)**: 40% - Session APIs exist, E2B/Claude integration missing

#### ❌ Critical Gaps
1. **Claude execution in E2B** - Container has Claude CLI but missing uspark CLI
2. **Real-time updates** - Polling hooks need to be re-implemented
3. **Session/Turn/Block APIs** - Schema exists but API endpoints not implemented

### Key Findings
- **Strong backend infrastructure** with complete APIs and database schema
- **Frontend implementation in closed PRs not satisfactory** - needs complete re-implementation
- **GitHub sync fully implemented** with Git Trees API for efficient sync ✅
- **E2B integration partial** - watch-claude works but container setup incomplete

### Recommended Next Steps
1. **Immediate**: Complete E2B container setup with uspark CLI
2. **Week 1**: Implement prompt template system
3. **Week 2**: Build task → Claude Code execution pipeline
4. **Week 3**: Test end-to-end workflow with real projects

## Dependencies

### External Dependencies

- Claude API access
- E2B platform availability
- Vercel Blob storage
- Clerk authentication service

### Internal Dependencies

- YJS sync protocol completion ✅
- CLI authentication completion ✅
- Database schema finalization ✅
- UI/UX design approval ✅
