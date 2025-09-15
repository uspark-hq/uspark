# uSpark

**The Manager for ALL AI Coding Tools** - Transform individual AI coding sessions into structured, scalable software projects through intelligent orchestration and documentation.

## 🎯 Core Value

uSpark bridges the gap between AI's code generation capabilities and real software engineering:

- **Project Intelligence**: Understands your codebase through GitHub integration
- **Task Orchestration**: Breaks down complex requirements into AI-executable tasks
- **Progress Tracking**: Analyzes commit history to track real progress - code doesn't lie
- **Technical Debt Management**: Identifies and tracks issues in AI-generated code

## 👥 Target Users

Developers using AI coding tools (Cursor/Windsurf/Claude Code) who need:
- Better project organization and task management
- Systematic documentation of AI coding sessions
- Technical debt tracking for AI-generated code
- Structured approach to scale beyond MVPs

## ✨ How It Works

### 1. Connect Your Project
Link your GitHub repository - uSpark analyzes your codebase architecture and understands your project context.

### 2. Plan with AI
Describe features in natural language - uSpark creates implementation plans, breaking them into AI-sized tasks with optimized prompts.

### 3. Execute with Any AI Tool
Copy prompts to Claude Code/Cursor/Windsurf - each prompt includes full context, constraints, and success criteria.

### 4. Track Real Progress
uSpark analyzes commits to verify what was actually built vs planned, maintaining honest project status.

## 🛠 Technical Stack

- **Web App**: Next.js 15, PostgreSQL, YJS for real-time collaboration
- **GitHub Sync**: Pushes project specs to `/specs` folder in your repo
- **Storage**: Content-addressed storage with S3, CRDT for collaboration
- **Auth**: Clerk for authentication

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/uspark-hq/uspark.git

# Install dependencies
cd uspark/turbo && pnpm install

# Setup environment
cp apps/web/.env.example apps/web/.env.local

# Run development
pnpm dev
```

## 📁 Project Structure

```
turbo/                    # Monorepo workspace
├── apps/
│   ├── web/           # Main web application
│   ├── cli/           # (deprecated - to be removed)
│   └── docs/          # Documentation
├── packages/          # Shared packages
└── e2e/              # End-to-end tests
```

## 🧪 Development

```bash
# Run tests
pnpm test

# Type checking
pnpm check-types

# Lint code
pnpm turbo run lint

# Format code
pnpm format
```

## 🏗 CI/CD

- **GitHub Actions**: Automated testing, linting, and deployment
- **Release Please**: Automated versioning and changelog generation
- **Quality Gates**: All code must pass lint, type check, and tests

## 📄 License

MIT - Open source software for AI-powered software development.