# MVP (Minimum Viable Product) Specification

## Overview

This document defines the mid-term goals and user stories for the MVP release of Uspark. The MVP focuses on delivering core functionality for GitHub bidirectional synchronization, AI-assisted editing, and document sharing.

## User Stories

### Story 1: GitHub Bidirectional Synchronization (For Human Users)

**As a** developer  
**I want to** sync uSpark documents with GitHub repositories using standard git workflows  
**So that** I can edit with my preferred tools while maintaining version control and team collaboration

#### Acceptance Criteria

- [ ] One-click GitHub OAuth authorization
- [ ] Automatic creation of dedicated docs repository (`{workspace}-docs`)
- [ ] Web edits automatically commit and push to GitHub
- [ ] Git pushes automatically sync to uSpark (via webhooks)
- [ ] Sync completes within 5 seconds
- [ ] Full commit history preserved
- [ ] Standard git commands work (clone, pull, push)
- [ ] No manual conflict resolution needed

#### Technical Requirements

- GitHub API integration for repository management
- Webhook handlers for push events
- Optimistic locking to prevent conflicts
- Support for large documents (>1MB)
- UTF-8 encoding for all markdown files
- Automatic pull before allowing new web edits

### Story 1b: uSpark CLI for E2B Container Synchronization (For AI Agents)

**As an** AI agent running in E2B container  
**I want to** use uspark CLI to sync project files between container and uSpark  
**So that** I can modify files and have changes automatically reflected in the main project

#### Acceptance Criteria

- [x] `uspark pull --project-id <id>` downloads entire project to container
- [x] `uspark push <file-path> --project-id <id>` uploads changes immediately
- [x] `uspark watch-claude` monitors Claude output and syncs file changes
- [x] Authentication via environment variable (USPARK_TOKEN)
- [ ] E2B container pre-configured with uspark CLI

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

- [ ] Web dashboard showing list of projects
- [ ] Document explorer showing project file tree
- [ ] Document viewer/editor for selected files
- [ ] Chat interface for entering Claude Code prompts
- [ ] Execution status indicators (via polling)
- [ ] Document updates as Claude makes changes (via YJS polling)

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

- [ ] "Share" button on document viewer
- [ ] Generate unique, unguessable share links
- [ ] View-only access for shared documents
- [ ] Share entire project or individual files
- [ ] Public preview page with clean UI

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

1. [ ] GitHub OAuth flow implementation
2. [ ] Repository creation API
3. [ ] Webhook endpoint for GitHub push events
4. [ ] Git operations wrapper for web edits
5. [ ] Conflict prevention mechanism
6. [ ] Sync status UI indicators

#### Phase 2b: uSpark CLI for E2B (Story 1b)

1. ✅ Complete `uspark pull` command
2. ✅ Implement `uspark push` command
3. ✅ Implement `uspark watch-claude` command
4. ✅ Update FileSystem class for direct blob access
5. [ ] E2B container configuration with pre-installed CLI
6. [ ] Container initialization scripts

### Phase 3: Web Interface Foundation (Story 2 - Part 1)

1. ✅ Project management APIs (list, create, get files)
2. ✅ Project dashboard page
3. ✅ Document explorer component
4. ✅ Basic document viewer
5. ✅ File tree navigation

### Phase 4: AI Integration (Story 2 - Part 2)

1. [ ] Claude execution API endpoints
2. [ ] E2B container setup and configuration
3. ✅ uspark watch-claude command implementation
4. [ ] Claude Code runtime integration
5. ⏳ Chat interface component (UI only, no backend)
6. [ ] Polling system for status updates
7. [ ] Document change detection via YJS polling
8. [ ] AWS Bedrock STS token generation for E2B Claude Code tasks

### Phase 5: Sharing Features (Story 3)

1. ✅ Share link generation API
2. ✅ Public document access API
3. [ ] Share management interface
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

## Technical Debt Status (Updated 2025-09-06)

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

## Dependencies

### External Dependencies

- Claude API access
- E2B platform availability
- Vercel Blob storage
- Clerk authentication service

### Internal Dependencies

- YJS sync protocol completion
- CLI authentication completion
- Database schema finalization
- UI/UX design approval
