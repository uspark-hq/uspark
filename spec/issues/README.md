# uSpark Technical Specifications

## Current Status: MVP Incomplete ⚠️

GitHub sync feature does not match MVP requirements. Current implementation creates dedicated repositories instead of syncing to user's existing repository `/spec` directory.

## Active Documentation

### Core Specifications
- [mvp.md](mvp.md) - MVP specification and implementation status
- [yjs.md](yjs.md) - YJS document synchronization system
- [github.md](github.md) - GitHub integration and sync
- [cli-auth.md](cli-auth.md) - CLI authentication system

### Feature Specifications
- [web-ui.md](web-ui.md) - Web interface components
- [claude-sessions-design.md](claude-sessions-design.md) - Session/Turn/Block architecture
- [e2b-runtime-container.md](e2b-runtime-container.md) - E2B container runtime
- [polling-system.md](polling-system.md) - Long polling implementation
- [claude-execution-implementation.md](claude-execution-implementation.md) - Claude execution details

### Archive
Historical documents and outdated specifications are stored in the [archive](archive/) directory.

## MVP Completion Summary

### ⚠️ Partially Completed Features

1. **GitHub Integration** (~60% - Does Not Match MVP Requirements)
   - ✅ GitHub App installation and authentication
   - ❌ Sync to existing repository (currently creates new dedicated repo)
   - ❌ Sync to `/spec` directory (currently mirrors entire project)
   - ✅ One-way sync (Web → GitHub)
   - ✅ Git Trees API implementation
   - ✅ UI for sync management

### ✅ Completed Features

2. **CLI Integration** (100%)
   - `uspark pull/push/watch-claude` commands
   - E2B container pre-configuration
   - Authentication via environment variables

3. **Web UI** (100%)
   - Project dashboard
   - Document explorer
   - Chat interface
   - Real-time updates via polling

4. **Claude Execution** (100%)
   - Real Claude integration via E2B
   - OAuth token management
   - Streaming response handling
   - Session/Turn/Block storage

5. **Infrastructure** (100%)
   - YJS document system
   - Vercel Blob storage
   - Long polling system
   - Database schema

## Post-MVP Roadmap

### Priority 1: Task Management
- Direct task document creation
- Task dependency tracking
- Progress monitoring

### Priority 2: Multi-Tool Support
- Cursor integration
- Windsurf integration
- GitHub Copilot Workspace

### Priority 3: Team Features
- Task assignment
- Shared technical debt tracking
- Architecture consistency checks

### Priority 4: Performance & Scale
- Auto-sync on edit
- Multi-region deployment
- Enhanced caching

## Known Issues (Must Fix for MVP)

These issues prevent MVP completion:
- **GitHub sync target**: Currently creates dedicated repo, must sync to existing repo's `/spec` directory
- **File path prefix**: Currently mirrors entire project, must prefix all files with `spec/`
- **Repository selection**: Currently auto-creates repo, must allow selecting existing repos

## Technical Debt (Accepted for MVP)

These limitations are accepted for the MVP release:
- Single-direction GitHub sync (Web → GitHub only)
- Manual sync trigger (no auto-sync)
- Basic authentication (no 2FA/SSO)
- Single region deployment
- Limited template system

## Getting Started

For development setup and contribution guidelines, see the main [README](../../README.md) in the project root.

## Questions?

For questions or clarifications about these specifications, please open an issue in the GitHub repository.