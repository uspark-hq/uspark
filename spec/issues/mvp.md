# MVP (Minimum Viable Product) Specification

## Overview

This document defines the mid-term goals and user stories for the MVP release of Uspark. The MVP focuses on delivering core functionality for document synchronization, AI-assisted editing, and document sharing.

## User Stories

### Story 1: Developer Document Synchronization

**As a** developer  
**I want to** use the `uspark` command line to pull a project to local and push files back to remote  
**So that** my documents stay synchronized with the cloud

#### Acceptance Criteria

- [ ] `uspark pull --project-id <id>` downloads entire project to local directory
- [ ] `uspark pull <file-path> --project-id <id>` downloads specific files
- [ ] `uspark push <file-path> --project-id <id>` uploads local changes to remote
- [ ] `uspark push --all --project-id <id>` uploads all modified files
- [ ] Authentication via CLI token or environment variable

#### Technical Requirements

- YJS-based synchronization protocol
- Vercel Blob storage for file content
- Binary diff/patch for efficient transfers
- Local file system integration

### Story 2: Web-based AI Document Editing

**As a** regular user  
**I want to** access my project documents in a web interface and use Claude Code via a chat input  
**So that** I can collaborate with AI to modify documents

#### Acceptance Criteria

- [ ] Web dashboard showing list of projects
- [ ] Document explorer showing project file tree
- [ ] Document viewer/editor for selected files
- [ ] Chat interface for entering Claude Code prompts
- [ ] Real-time execution status indicators
- [ ] Live document updates as Claude makes changes

#### Technical Requirements

- E2B container runtime for Claude Code execution
- WebSocket or SSE for real-time updates
- YJS for real-time document synchronization
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
5. [ ] Blob STS token API for direct access

### Phase 2: Developer Tools (Story 1)
1. ⏳ Complete `uspark pull` command
2. [ ] Implement `uspark push` command
3. [ ] Implement `uspark push --all` command
4. [ ] Update FileSystem class for direct blob access

### Phase 3: Web Interface Foundation (Story 2 - Part 1)
1. [ ] Project management APIs (list, create, get files)
2. [ ] Project dashboard page
3. [ ] Document explorer component
4. [ ] Basic document viewer
5. [ ] File tree navigation

### Phase 4: AI Integration (Story 2 - Part 2)
1. [ ] Claude execution API endpoints
2. [ ] E2B container setup and configuration
3. [ ] uspark watch-claude command implementation
4. [ ] Claude Code runtime integration
5. [ ] Chat interface component
6. [ ] WebSocket/SSE for real-time updates
7. [ ] Document change streaming

### Phase 5: Sharing Features (Story 3)
1. [ ] Share link generation API
2. [ ] Public document access API
3. [ ] Share management interface
4. [ ] Public document viewer page

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

