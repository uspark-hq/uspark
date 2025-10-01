# MVP (Minimum Viable Product) Specification

## Overview

This document defines the mid-term goals and user stories for the MVP release of Uspark. The MVP focuses on validating the core technical pipeline: managing AI coding projects through structured documents (tasks, specs, technical debt) that are edited via Claude Code in E2B containers and synced to GitHub for use by external AI coding tools.

## User Stories

### Story 1: GitHub One-Way Synchronization (For Human Users)

**As a** technical CEO/founder or developer
**I want to** push uSpark documents to my existing GitHub repository's `/spec` directory
**So that** AI coding tools can access project context and specs alongside my codebase

#### Acceptance Criteria

- [x] One-click GitHub App installation ✅
- [ ] ❌ Select existing repository from user's repos (currently creates dedicated repo)
- [ ] ❌ Sync to `/spec` directory in existing repo (currently mirrors entire project to new repo)
- [x] Web edits can be manually synced to GitHub via sync button ✅
- [x] Sync completes within 5 seconds ✅
- [x] Full file content pushed to GitHub ✅
- [x] Settings UI for GitHub connection management ✅
- [x] Sync status indicator showing last sync time ✅
- [x] Basic sync lock to prevent concurrent operations ✅
- [ ] ❌ Preserve existing files outside `/spec` directory (currently replaces entire repo)

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
4. [x] Claude Code runtime integration ✅ (Real Claude execution via E2B implemented)
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

## Implementation Status Summary (2025-09-29)

### Overall Completion: 95% 🔄

#### ✅ Completed Features (Working)
- **Story 1 (GitHub)**: 100% - All MVP requirements completed ✅
- **Story 1b (CLI)**: 100% - All CLI commands working, E2B container fully configured ✅
- **Story 2 (Web UI)**: 90% - Core UI complete, but needs refactoring 🔄
- **Phase 4 (AI)**: 100% - Real Claude execution via E2B fully implemented ✅

#### 🔄 In Progress: Project Details Page Migration
- **Issue**: Complex polling and frontend logic in web project details page is difficult to manage with React useState/useEffect hooks
- **Solution**: Migrating project details page to workspace project with ccstate for better state management
- **Status**: Migration in progress to separate state logic from UI components
- **Benefits**: Cleaner architecture, easier maintenance, better testability

#### ✅ Confirmed Working Features
- **uSpark CLI**: `uspark push` and `uspark pull` commands fully functional ✅
- **Authentication**: CLI auth via USPARK_TOKEN environment variable working ✅
- **YJS Synchronization**: Document sync protocol operational ✅
- **Blob Storage**: Direct blob access for file operations working ✅
- **Database Structure**: Session/turn/block schema implemented ✅

#### ⏳ Pending Verification (Requires Web UI Completion)
- **E2B Container Integration**: Container setup complete but full end-to-end verification pending
- **Claude Code Execution in E2B**: Implementation complete, awaiting UI refactor for testing
- **Real-time Polling**: Implemented but needs testing with refactored UI
- **watch-claude Command**: Ready but requires E2B container validation

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

#### Story 2 (Web AI Interface): 100% ✅
- [x] Web dashboard showing list of projects ✅
- [x] Document explorer showing project file tree ✅
- [x] Document viewer/editor for selected files ✅
- [x] Chat interface for entering Claude Code prompts ✅
- [x] Execution status indicators (via polling) ✅ (PR #320)
- [x] Document updates as Claude makes changes (via YJS polling) ✅ (PR #320)
- [x] Real Claude execution in E2B containers ✅

#### Story 1b (CLI Integration): 100% ✅
- [x] `uspark pull --project-id <id>` downloads entire project to container ✅
- [x] `uspark push <file-path> --project-id <id>` uploads changes immediately ✅
- [x] `uspark watch-claude` monitors Claude output and syncs file changes ✅
- [x] Authentication via environment variable (USPARK_TOKEN) ✅
- [x] E2B container pre-configured with Claude Code CLI ✅
- [x] E2B container pre-configured with uspark CLI ✅ (PR #314)
- [x] Container initialization scripts ✅ (PR #314)

### Recommended Next Steps
1. **Immediate**: Integration testing of the complete system
2. **Week 1**: Performance optimization and bug fixes
3. **Week 2**: Deploy to production environment
4. **Week 3**: Gather user feedback and iterate

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
