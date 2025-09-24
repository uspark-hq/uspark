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
- [x] Execution status indicators (via polling) ✅ (PR #320)
- [x] Document updates as Claude makes changes (via YJS polling) ✅ (PR #320)

#### Technical Requirements

- E2B container runtime for Claude Code execution
- Polling API for status updates
- YJS for document synchronization (polling-based)
- Queue system for managing Claude tasks
- Audit logging for all AI operations


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
5. [x] E2B container configuration with pre-installed CLI ✅ (PR #314)
6. [x] Container initialization scripts ✅ (PR #314)

### Phase 3: Web Interface Foundation (Story 2 - Part 1)

1. ✅ Project management APIs (list, create, get files)
2. ✅ Project dashboard page
3. ✅ Document explorer component
4. ✅ Basic document viewer
5. ✅ File tree navigation

### Phase 4: AI Integration (Story 2 - Part 2)

1. [x] Claude execution API endpoints ✅ (Session APIs implemented)
2. [x] E2B container setup and configuration ✅ (PR #314)
3. [x] uspark watch-claude command implementation ✅
4. [ ] Claude Code runtime integration ❌
5. [x] Chat interface component ✅ (UI and backend integrated)
6. [x] Polling system for status updates ✅ (PR #320)
7. [x] Document change detection via YJS polling ✅ (PR #320)
8. [x] Claude OAuth token storage for E2B execution ✅ (PR #347)



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

1. All user stories (Story 1, Story 1b, Story 2) are fully implemented
2. Core functionality passes QA testing
3. Documentation covers basic usage
4. System handles 10 concurrent users
5. Critical bugs are resolved
6. Deployment pipeline is operational

## Next Steps After MVP

Post-MVP priorities aligned with AI coding management:

1. **Task Management System**
   - Task document creation UI
   - Task dependency management
   - Automated progress tracking
   - Task completion analytics

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

5. **Advanced Automation (Future)**
   - Template system for common tasks
   - Automated task generation from Claude responses
   - Smart prompt engineering

## Implementation Status Summary (2025-09-24)

### Overall Completion: ~90%

#### ✅ Completed Features (Working)
- **Story 1 (GitHub)**: 100% - All MVP requirements completed ✅
- **Story 1b (CLI)**: 100% - All CLI commands working, E2B container fully configured ✅
- **Story 2 (Web UI)**: 85% - UI complete, APIs complete, long polling implemented ✅

#### 🟡 Partially Completed
- **Phase 4 (AI)**: 70% - Session APIs complete, mock execution working, real Claude integration pending

#### ❌ Remaining Gap
1. **Real Claude execution in E2B** - Mock executor implemented, needs integration with stored Claude OAuth tokens

### Key Findings After Recent PRs

**PR #320 (Long Polling)**: ✅ Completed
- Simplified long polling system implemented
- Real-time session updates working
- Frontend `useSessionPolling` hook refactored
- State-based tracking with `turnId:blockCount` format

**PR #314 (E2B Container)**: ✅ Completed
- Complete E2B Dockerfile with both Claude Code CLI and uspark CLI
- Container initialization script (`init.sh`) with environment validation
- Automatic project file synchronization on startup
- E2B template configuration (`e2b.toml`) ready

### Updated Implementation Status

#### Story 2 (Web AI Interface): 85% ✅
- [x] Web dashboard showing list of projects ✅
- [x] Document explorer showing project file tree ✅
- [x] Document viewer/editor for selected files ✅
- [x] Chat interface for entering Claude Code prompts ✅
- [x] Execution status indicators (via polling) ✅ (PR #320)
- [x] Document updates as Claude makes changes (via YJS polling) ✅ (PR #320)

#### Story 1b (CLI Integration): 100% ✅
- [x] `uspark pull --project-id <id>` downloads entire project to container ✅
- [x] `uspark push <file-path> --project-id <id>` uploads changes immediately ✅
- [x] `uspark watch-claude` monitors Claude output and syncs file changes ✅
- [x] Authentication via environment variable (USPARK_TOKEN) ✅
- [x] E2B container pre-configured with Claude Code CLI ✅
- [x] E2B container pre-configured with uspark CLI ✅ (PR #314)
- [x] Container initialization scripts ✅ (PR #314)

### Recommended Next Steps
1. **Immediate**: Implement real Claude execution using stored OAuth tokens
2. **Week 1**: Complete E2B integration with Claude OAuth tokens
3. **Week 2**: Complete integration testing and bug fixes
4. **Week 3**: Deploy MVP and gather user feedback

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
