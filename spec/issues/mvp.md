# MVP (Minimum Viable Product) Specification

## Overview

This document defines the mid-term goals and user stories for the MVP release of Uspark. The MVP focuses on delivering core functionality for GitHub one-way synchronization (Web → GitHub), AI-assisted editing, and document sharing.

## User Stories

### Story 1: GitHub One-Way Synchronization (For Human Users)

**As a** developer  
**I want to** push uSpark documents to GitHub repositories  
**So that** I can backup my work and share it with team members who prefer GitHub

#### Acceptance Criteria

- [x] One-click GitHub App installation ✅
- [x] Automatic creation of dedicated repository (`uspark-{project.id}`) ✅
- [x] Web edits can be manually synced to GitHub via sync button ✅
- [x] Sync completes within 5 seconds ✅
- [x] Full file content pushed to GitHub ✅
- [ ] Settings UI for GitHub connection management
- [ ] Sync status indicator showing last sync time
- [ ] Basic sync lock to prevent concurrent operations

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

**As an** AI agent running in E2B container  
**I want to** use uspark CLI to sync project files between container and uSpark  
**So that** I can modify files and have changes automatically reflected in the main project

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

**As a** regular user  
**I want to** access my project documents in a web interface and use Claude Code via a chat input  
**So that** I can collaborate with AI to modify documents

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

### Story 3: Document Sharing via Public Links

**As a** regular user  
**I want to** create shareable links for my documents  
**So that** others can view my document content

#### Acceptance Criteria

- [x] "Share" button on document viewer ✅
- [x] Generate unique, unguessable share links ✅
- [x] View-only access for shared documents ✅
- [x] Share entire project or individual files ✅ (individual files)
- [x] Public preview page with clean UI ✅

#### Technical Requirements

- Secure token generation for share links
- Public routes bypassing authentication
- Read-only document rendering
- Share link management database schema
- Rate limiting for public endpoints

## Implementation Priorities

### Phase 1: Core Infrastructure (Prerequisites)

1. ✅ YJS document synchronization API
2. ✅ Vercel Blob storage integration
3. ✅ Basic authentication system
4. ✅ CLI environment variable authentication
5. ✅ Blob STS token API for direct access

### Phase 2: Synchronization Features

#### Phase 2a: GitHub Integration (Story 1)

1. [ ] GitHub OAuth flow implementation ❌
2. [x] Repository creation API ✅
3. [x] Webhook endpoint for GitHub push events ✅ (handler exists, push logic not implemented)
4. [ ] Git operations wrapper for web edits ❌
5. [ ] Conflict prevention mechanism ❌
6. [ ] Sync status UI indicators ❌

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

### Phase 5: Sharing Features (Story 3)

1. ✅ Share link generation API
2. ✅ Public document access API
3. [x] Share management interface ✅
4. ✅ Public document viewer page

## Out of Scope for MVP

The following features are explicitly excluded from the MVP:

1. **Collaboration Features**

   - Real-time collaborative editing
   - User comments and annotations
   - Change attribution and history

2. **Advanced AI Features**

   - Custom AI model selection
   - Fine-tuning or training
   - AI cost tracking and limits

3. **Enterprise Features**

   - Team workspaces
   - Role-based access control
   - SSO/SAML integration
   - Audit logs export

4. **Advanced Sync Features**

   - Selective sync filters
   - Bandwidth throttling
   - Offline mode with queue

5. **Payment & Billing**
   - Subscription management
   - Usage-based pricing
   - Payment processing

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

Post-MVP priorities (not in scope for current release):

1. Team collaboration features
2. Advanced AI capabilities
3. Enterprise security features
4. Performance optimizations
5. Mobile applications
6. API for third-party integrations

## Implementation Status Summary (2025-01-13)

### Overall Completion: ~75%

#### ✅ Completed Features (Working)
- **Story 1b (CLI)**: 85% - All CLI commands working, E2B container partially configured
- **Story 2 (Web UI)**: 65% - UI complete, Claude sessions schema done, APIs missing
- **Story 3 (Sharing)**: 100% - Fully implemented with management interface

#### 🟡 Partially Completed
- **Story 1 (GitHub)**: 25% - Repository creation API done, bidirectional sync missing
- **Phase 4 (AI)**: 40% - Session APIs exist, E2B/Claude integration missing

#### ❌ Critical Gaps
1. **GitHub bidirectional sync** - No document push/pull with GitHub
2. **Claude execution in E2B** - Container has Claude CLI but missing uspark CLI
3. **Real-time updates** - Polling hooks need to be re-implemented
4. **Session/Turn/Block APIs** - Schema exists but API endpoints not implemented

### Key Findings
- **Strong backend infrastructure** with complete APIs and database schema
- **Frontend implementation in closed PRs not satisfactory** - needs complete re-implementation
- **GitHub App foundation ready** but sync logic not implemented
- **E2B integration partial** - watch-claude works but container setup incomplete

### Recommended Next Steps
1. **Immediate**: Re-implement frontend components (useSessionPolling, display components)
2. **Week 1**: Implement GitHub document push using Git Trees API
3. **Week 2**: Complete E2B container Claude CLI configuration
4. **Week 3**: Integrate new polling system for real-time updates

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
