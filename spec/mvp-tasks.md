# MVP Task List

## Status Key
- ✅ Completed
- 🚧 In Progress
- ⏸️ Blocked
- ⭐ High Priority
- 📋 To Do

---

## 1. Registration & Onboarding

### 1.1 User Authentication
- [ ] Registration completes in < 2 minutes
- [ ] Clear value proposition communicated
- [ ] Support for email authentication
- [ ] Support for OAuth providers (Google, GitHub)
- [ ] Email verification for security
- [ ] User onboarding wizard

**Dependencies**: Clerk setup
**Estimate**: 3 days

---

## 2. GitHub Account Connection

### 2.1 GitHub OAuth Integration
- [ ] GitHub OAuth integration with proper scopes
- [ ] Repository selection interface
- [ ] Connection status clearly displayed
- [ ] Ability to manage/revoke access in settings
- [ ] Support for both public and private repositories

**Dependencies**: GitHub App creation
**Estimate**: 2 days
**Notes**: Use GitHub App (not OAuth App) for better permission management. Required permissions: `repo`, `read:user`

---

## 3. Project Creation

### 3.1 Import Existing Project
- [ ] Repository browser showing accessible repos
- [ ] Branch selection for existing projects
- [ ] Project creation completes in < 5 seconds
- [ ] Clear status indicator during creation

### 3.2 Start from Scratch
- [ ] Option to create new empty project
- [ ] Optional GitHub repo creation for new projects
- [ ] Default project structure setup

**Dependencies**: GitHub integration
**Estimate**: 3 days

---

## 4. Automated Project Analysis & Spec Generation

### 4.1 Analysis Pipeline
- [ ] Automatic analysis triggered on project creation
- [ ] Analysis completes within 5 minutes for repos < 100k LOC
- [ ] Generates minimum 4 core spec documents
- [ ] Progress indicator shows analysis stages
- [ ] Results accessible in project dashboard
- [ ] Specs stored in `.uspark/` directory in project root
- [ ] Analysis can be re-run manually

### 4.2 Spec Documents Generation
- [ ] `architecture.md` - System architecture overview with Mermaid diagrams
- [ ] `tech-stack.md` - Technology choices and rationale
- [ ] `quality-report.md` - Code quality assessment
- [ ] `improvement-plan.md` - Prioritized improvement recommendations
- [ ] `tech-debt.md` - Technical debt inventory

**Dependencies**: E2B container setup, Claude Code integration
**Estimate**: 1 week
**Priority**: ⭐ High

---

## 5. Interactive Agent Consultation

### 5.1 Chat Interface
- [ ] Persistent chat interface on project detail page
- [ ] Agent has full context of all generated specs
- [ ] Agent can reference specific files and line numbers
- [ ] Conversation history saved per project
- [ ] Real-time streaming of agent responses
- [ ] Support for follow-up questions and clarifications

### 5.2 Agent Capabilities
- [ ] Agent can modify/update spec files during conversation
- [ ] Agent can generate new task documents in `.uspark/tasks/`
- [ ] Context-aware answers based on project analysis
- [ ] Code reference links (`file:line` → jump to GitHub)
- [ ] Mermaid diagram rendering in chat
- [ ] Task generation and tracking

**Dependencies**: Analysis pipeline, E2B container
**Estimate**: 1 week
**Priority**: ⭐ High

---

## 6. E2B Container File Synchronization

### 6.1 File Watching & Sync
- [ ] Real-time file change detection in E2B container
- [ ] Automatic sync of `.uspark/` directory on session end
- [ ] Periodic sync during long-running sessions (every 30 seconds)
- [ ] File versioning (track changes over time)
- [ ] Sync status indicator in UI
- [ ] Support for binary files (images in specs)

### 6.2 Conflict Resolution
- [ ] Conflict resolution (container changes vs. web edits)
- [ ] Conflict dialog for user to choose version
- [ ] Merge capabilities for non-conflicting changes

### 6.3 GitHub Integration
- [ ] Optional GitHub commit of changes
- [ ] Commit message generation for spec updates
- [ ] Sync status tracking

**Dependencies**: E2B container, file storage
**Estimate**: 5 days
**Priority**: ⭐ High

---

## 7. Markdown Preview Interface

### 7.1 GitHub-Flavored Markdown Support
- [ ] Full GitHub Markdown compatibility (tested with GFM spec)
- [ ] Tables with alignment
- [ ] Task lists (checkboxes)
- [ ] Syntax highlighting for code blocks (50+ languages)
- [ ] Footnotes
- [ ] Strikethrough, highlighting
- [ ] Automatic URL linking
- [ ] Emoji support

### 7.2 Mermaid Diagram Rendering
- [ ] Mermaid diagrams render correctly for all supported types
- [ ] Flowcharts support
- [ ] Sequence diagrams support
- [ ] Gantt charts support
- [ ] Class diagrams support
- [ ] State diagrams support
- [ ] ER diagrams support
- [ ] Interactive zoom/pan for complex diagrams

### 7.3 Enhanced Preview Features
- [ ] Table of contents (auto-generated from headers)
- [ ] Smooth scrolling
- [ ] Header anchor links
- [ ] Copy code button in code blocks
- [ ] Image lightbox for screenshots
- [ ] Print-friendly styling
- [ ] Dark/light theme support
- [ ] Preview updates in real-time when editing
- [ ] Responsive layout (mobile-friendly)
- [ ] Fast rendering (< 100ms for documents < 1MB)
- [ ] Images load with proper error handling

**Dependencies**: None
**Estimate**: 4 days

---

## 8. Preview/Edit Mode Switching

### 8.1 Preview Mode (Default)
- [ ] Read-only rendered markdown
- [ ] Full GFM + Mermaid support
- [ ] Action buttons: Edit, Download, Copy Link
- [ ] File metadata display (last modified, size)
- [ ] Preview is default mode when opening file

### 8.2 Edit Mode
- [ ] Edit button clearly visible in preview mode
- [ ] Live markdown editor with syntax highlighting
- [ ] Split view (editor | preview) or single view toggle
- [ ] Auto-save draft every 10 seconds
- [ ] Unsaved changes indicator
- [ ] Keyboard shortcuts (Cmd+S to save, Cmd+B for bold, etc.)
- [ ] Markdown toolbar (bold, italic, link, image, code, etc.)
- [ ] Keyboard shortcuts documented and functional

### 8.3 Mode Switching
- [ ] Smooth transition animation
- [ ] Preserve scroll position when switching
- [ ] Warn on unsaved changes
- [ ] Keyboard shortcut: `Cmd+E` (Edit) / `Cmd+P` (Preview)
- [ ] Mode preserved in URL (shareable links to edit mode)

**Dependencies**: Markdown preview
**Estimate**: 3 days

---

## 9. Save Functionality

### 9.1 Basic Save
- [ ] Save button enabled only when changes detected
- [ ] Loading indicator during save
- [ ] Success/error notifications
- [ ] Markdown validation before save
- [ ] Optimistic UI update (immediate preview)
- [ ] File size limits (< 5MB)

### 9.2 Advanced Features
- [ ] Error handling (network issues, validation errors)
- [ ] Version history (track who edited when)
- [ ] Optional GitHub commit with message
- [ ] Mermaid diagram validation
- [ ] Conflict handling for concurrent edits

**Dependencies**: Edit mode, blob storage
**Estimate**: 2 days

---

## 10. Project Dashboard

### 10.1 Project List
- [ ] Display list of user's projects
- [ ] Project creation button
- [ ] Project search/filter
- [ ] Sort by created date, name, status
- [ ] Project status indicators (analyzing, ready, error)

### 10.2 Project Detail Page
- [ ] File tree navigation
- [ ] Document explorer showing project files
- [ ] Selected file preview/edit area
- [ ] Chat interface for agent interaction
- [ ] Sync status indicators
- [ ] Project settings access

**Dependencies**: Project creation, file storage
**Estimate**: 4 days

---

## 11. Infrastructure & Technical Requirements

### 11.1 Database Schema
- [ ] Projects table with GitHub integration fields
- [ ] Files table with blob URLs and metadata
- [ ] FileVersions table for version history
- [ ] Sessions table for agent conversations
- [ ] User settings table

### 11.2 File Storage
- [ ] Vercel Blob integration
- [ ] File upload API
- [ ] File download API
- [ ] Direct blob access with STS tokens
- [ ] Content-addressed storage

### 11.3 E2B Container Setup
- [ ] E2B template with Claude Code CLI
- [ ] E2B template with uspark CLI
- [ ] Container initialization scripts
- [ ] File watching in containers
- [ ] Sandbox reuse and management

### 11.4 Authentication & Authorization
- [ ] Clerk integration
- [ ] User session management
- [ ] GitHub OAuth tokens storage
- [ ] Claude API tokens storage (encrypted)
- [ ] Project ownership verification

**Estimate**: 1 week
**Priority**: ⭐ High (Foundation)

---

## 12. Testing & Quality

### 12.1 End-to-End Tests
- [ ] User registration flow
- [ ] GitHub connection flow
- [ ] Project creation (import & new)
- [ ] Analysis pipeline
- [ ] File preview and edit
- [ ] Agent chat interaction
- [ ] File synchronization

### 12.2 Unit Tests
- [ ] API route tests
- [ ] Component tests
- [ ] Utility function tests
- [ ] Database operation tests
- [ ] >70% code coverage

### 12.3 Code Quality
- [ ] All TypeScript type checks passing
- [ ] Linting and formatting automated
- [ ] Pre-commit hooks setup
- [ ] CI/CD pipeline

**Estimate**: 1 week
**Priority**: Medium

---

## 13. Documentation

### 13.1 User Documentation
- [ ] Getting started guide
- [ ] GitHub connection guide
- [ ] Project analysis explanation
- [ ] Agent interaction guide
- [ ] Markdown editing tutorial

### 13.2 Developer Documentation
- [ ] API documentation
- [ ] Database schema docs
- [ ] Architecture documentation
- [ ] Deployment guide
- [ ] Contributing guide

**Estimate**: 3 days
**Priority**: Medium

---

## 14. Production Readiness

### 14.1 Deployment
- [ ] Deployed to Vercel
- [ ] Database migrations automated
- [ ] Environment variables configured
- [ ] Custom domain setup (if applicable)

### 14.2 Monitoring & Analytics
- [ ] Error monitoring (Sentry)
- [ ] Basic analytics (PostHog or similar)
- [ ] Performance monitoring
- [ ] Uptime monitoring

### 14.3 Performance
- [ ] Analysis completes in < 5 minutes
- [ ] Preview renders in < 100ms
- [ ] Agent responds in < 2 seconds (first token)
- [ ] File sync completes in < 5 seconds

**Estimate**: 2 days
**Priority**: High

---

## Summary

### Total Estimated Timeline
- **Foundation & Infrastructure**: 2 weeks
- **Core Features**: 4 weeks
- **Polish & Testing**: 2 weeks
- **Total**: ~8 weeks

### Critical Path
1. Infrastructure setup (auth, database, storage)
2. GitHub integration
3. Project creation
4. Analysis pipeline
5. File preview/edit
6. Agent interaction
7. File synchronization
8. Testing & deployment

### High Priority Items (⭐)
- Project analysis & spec generation
- Interactive agent consultation
- E2B container file synchronization
- Infrastructure & authentication
- Production deployment
