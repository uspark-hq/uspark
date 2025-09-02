# uSpark

**AI-powered knowledge work platform that generates and manages Markdown documents through conversational interaction, transforming AI-created content into editable, manageable, and reusable knowledge assets.**

## 🎯 Core Value

- **Conversation-driven**: Natural language interaction, no complex operations to learn
- **Document management**: AI-generated content automatically saved as editable Markdown documents  
- **Team collaboration**: Real-time collaborative editing based on CRDT technology
- **Local sync**: Local file editing via File Provider and command-line tools

## 👥 Target Users

**AI Power Users** (knowledge workers with AI service subscriptions):

- **Product Managers/Designers** (30%) - Create PRDs and design specs through AI conversation
- **Entrepreneurs/Indie Developers** (25%) - Generate and manage project documentation  
- **Content Creators** (25%) - AI-assisted content creation and organization
- **Technical Personnel** (20%) - Documentation and knowledge base management

## ✨ Key Features

### 💬 AI-Native Document Generation
- Natural language conversation interface (like ChatGPT)
- Automatic generation of structured Markdown documents (PRDs, specs, notes)
- AI remembers document context for iterative improvements
- Conversation outcomes become manageable, editable documents

### 👥 Real-time Team Collaboration  
- Collaborative editing powered by YJS/CRDT technology
- See team members' cursors and changes in real-time
- Collective AI interaction - any team member can continue conversations
- Activity feeds and change tracking across team workspace

### 🔄 Local File Sync
- **CLI Tool (`usync`)**: Cross-platform command-line synchronization
- **macOS Integration**: Native Finder support via File Provider extension
- **Bidirectional Sync**: Local edits sync back to cloud automatically
- **Developer Workflow**: Use any editor (VS Code, Cursor, etc.) with familiar tools

### 📚 Knowledge Management
- Documents accumulate to form searchable knowledge base
- Version history and document relationships preserved
- Export capabilities while maintaining team collaboration context
- Content-addressed storage with efficient deduplication

## 📁 Project Structure

```
turbo/                    # Monorepo workspace
├── apps/
│   ├── cli/           # usync CLI tool for local file synchronization  
│   ├── web/           # Main uSpark web application with AI chat
│   └── docs/          # Documentation site
├── packages/
│   ├── core/          # Shared utilities and types
│   ├── ui/            # Reusable UI components
│   ├── eslint-config/ # ESLint configuration
│   └── typescript-config/ # TypeScript configuration
└── e2e/               # End-to-end tests
```

## 🛠 Applications

### Web Application (`apps/web`)
- **Framework**: Next.js 15 with React 19  
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Clerk for user management
- **Core Features**: AI conversation interface, real-time document editing, team collaboration
- **Architecture**: Global services pattern with lazy-loaded connections

### CLI Tool (`apps/cli`) - `usync`
- **Purpose**: Local file synchronization and developer workflow integration
- **Authentication**: Device authorization flow with Clerk integration
- **Features**: Bidirectional sync, offline editing support, cross-platform compatibility
- **Distribution**: NPM package (`@uspark/cli`)

### Documentation (`apps/docs`)  
- **Framework**: Fumadocs for modern documentation
- **Content**: API documentation, user guides, development setup
- **Features**: MDX support, search, auto-generated navigation

## 🏗 Development

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL (for local development)

### Quick Start

```bash
# Install dependencies
cd turbo && pnpm install

# Set up environment variables
cp turbo/apps/web/.env.example turbo/apps/web/.env.local
# Configure DATABASE_URL, CLERK keys, etc.

# Run database migrations
cd turbo/apps/web && pnpm db:migrate

# Start all development servers
cd turbo && pnpm dev
```

### Development Commands

```bash
# Run tests (requires PostgreSQL service)
pnpm test

# Lint all packages
pnpm turbo run lint

# Type checking across monorepo  
pnpm check-types

# Format code
pnpm format
```

### Database Commands

```bash
# Generate new migration files
cd turbo/apps/web && pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Open Drizzle Studio (database browser)
pnpm db:studio
```

### CLI Development

```bash
# Build CLI package
cd turbo && pnpm -F @uspark/cli build

# Test CLI locally  
cd turbo/apps/cli/dist && npm link
uspark --help
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

#### **Turbo Workflow** (`/.github/workflows/turbo.yml`)
Runs on every PR and push to main:

1. **Lint**: Code quality checks using Lefthook pre-commit hooks
2. **Test**: Unit tests with PostgreSQL service container
3. **Build CLI**: Compiles CLI package and uploads artifacts
4. **E2E Tests**: End-to-end testing with built CLI package

#### **Release Please** (`/.github/workflows/release-please.yml`)
Automated release management:

- **Trigger**: Runs after successful Turbo workflow on main branch
- **Release PR**: Creates/updates release PR with version bumps and changelog
- **NPM Publishing**: Publishes CLI package to NPM when CLI release is created
- **Conventional Commits**: Uses commit messages to determine version bumps

#### **General Workflow** (`/.github/workflows/general.yml`)
- **Commit Lint**: Validates commit message format using conventional commits

### Development Workflow

#### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit using conventional commits
git commit -m "feat: add document collaboration feature"

# Push and create PR
git push origin feature/new-feature
```

#### 2. Pull Request Process
- **Automated Checks**: Lint, test, build, and E2E tests run automatically
- **Code Review**: Team reviews the changes
- **Merge**: PR merged to main after approval and passing checks

#### 3. Release Process
- **Release PR**: `release-please` bot creates PR with version bumps
- **Review Release**: Team reviews changelog and version changes
- **Release**: Merging release PR triggers NPM publication and GitHub release

### Quality Gates

All code must pass these checks before merging:
- **Lint**: `pnpm turbo run lint` - Code style and quality
- **Type Check**: `pnpm check-types` - TypeScript type safety  
- **Tests**: `pnpm test` - Unit test coverage
- **E2E**: CLI functionality tests
- **Commit Format**: Conventional commit message validation

## 🧪 Testing

### Unit Tests
```bash
# Run all tests with coverage
cd turbo && pnpm test

# Watch mode for development
pnpm test:watch

# Interactive test UI
pnpm test:ui
```

### E2E Tests  
```bash
# Run end-to-end CLI tests
cd e2e && make test

# The E2E tests verify:
# - CLI installation and basic functionality
# - Authentication flows
# - File synchronization features
```

## 🏛 Technical Architecture

### Data Storage Strategy
- **File Content**: Content-addressed storage for deduplication efficiency
- **Metadata**: YJS documents enable real-time collaborative editing
- **Database**: PostgreSQL with Drizzle ORM for structured data
- **Authentication**: Clerk with custom device flow for CLI

### YJS File System Design
```typescript
// Real-time collaborative document structure
const ydoc = new Y.Doc();
const files = ydoc.getMap('files');  // path -> file metadata  
const blobs = ydoc.getMap('blobs');  // hash -> content metadata

// Separation of concerns:
// - files: path-specific information (mtime, references)
// - blobs: content-specific information (size, deduplication)
```

### CLI Authentication Flow
```
1. uspark auth login → Generate device code
2. Open browser → User authenticates with Clerk  
3. CLI polls for token → Receive JWT token
4. Store in keychain → Future requests authenticated
```

### Global Services Pattern
```typescript
// Lazy-loaded singleton services
import { initServices } from "../lib/init-services";

initServices(); // Idempotent initialization
const users = await globalThis.services.db.select().from(users);
```

## 🧪 Testing

### Unit Tests
```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
pnpm test:ui       # Interactive UI
```

### E2E Tests
```bash
cd e2e && make test
```

## 🏛 Architecture Principles

### 1. Strict Type Safety
- Zero `any` types allowed
- Comprehensive TypeScript configuration
- Runtime validation with Zod

### 2. Monorepo Benefits
- Shared configurations and dependencies
- Consistent code quality across packages
- Efficient build caching with Turbo

### 3. Modern Deployment
- Preview environments for every PR
- Database branching for isolation
- Comprehensive deployment tracking

### 4. Developer Experience
- Fast hot reload with Turbopack
- Container-based development
- Automated code formatting and linting

## 🎯 User Stories & Use Cases

### Product Manager Creating PRDs
```
"I need a PRD for a user authentication feature with SSO support"
→ AI generates structured PRD with standard sections
→ PM refines through conversation: "Add security requirements"  
→ Document auto-saves and becomes team knowledge base
```

### Developer Local Workflow
```
1. Install: npm install -g @uspark/cli
2. Authenticate: uspark auth login
3. Sync: Documents appear in local folder
4. Edit: Use VS Code, Cursor, or any preferred editor
5. Auto-sync: Changes sync back to cloud and team
```

### Team Real-time Collaboration  
```
1. PM creates product spec via AI conversation
2. Designer adds UI considerations in real-time
3. Developer contributes technical constraints  
4. Team collectively refines through AI assistance
5. Final document reflects team consensus
```

## 🚀 Product Vision

### Core Insight
> **Conversation is the most natural interaction, but conversation outcomes need structured management.**

### Competitive Differentiation
- **vs ChatGPT/Claude**: Documents are manageable and persistent, not just conversation history
- **vs Notion**: AI-native from ground up, not AI-as-assistant bolted onto traditional tools
- **vs GitHub**: Defines AI knowledge collaboration like GitHub defined code collaboration

### Network Effects Strategy
- **Individual Use** → AI-generated documents accumulate value
- **Team Collaboration** → Shared workflows and domain knowledge  
- **Organizational Dependency** → Migration costs grow exponentially

## 🔧 Development Guidelines

This project follows strict development principles outlined in `/CLAUDE.md`:

### YAGNI Principle
- Don't add functionality until actually needed
- Start with simplest solution that works  
- Delete unused code aggressively

### Zero Tolerance for Lint Violations
- Never use `eslint-disable` comments
- Never use `@ts-ignore` or `any` types
- Fix underlying issues, don't suppress warnings

### Conventional Commits Required
```bash
feat: add user authentication system
fix: resolve database connection timeout  
docs(api): update endpoint documentation
```

### Pre-commit Quality Checks
```bash
cd turbo && pnpm turbo run lint    # Code style
cd turbo && pnpm check-types       # Type safety  
cd turbo && pnpm format           # Auto-format
cd turbo && pnpm vitest           # Run tests
```

## 📦 Package Management

This project uses **pnpm** with workspace protocol for efficient package management and **Turbo** for optimized builds and caching.

## 📄 License

MIT - Open source software for AI-powered knowledge work.
