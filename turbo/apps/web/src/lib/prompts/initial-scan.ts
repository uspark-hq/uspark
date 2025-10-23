/**
 * Initial Repository Scan Prompt Template
 */

const INITIAL_SCAN_PROMPT = `You are a senior software architect performing a comprehensive codebase analysis to create a technical wiki similar to DeepWiki (https://deepwiki.com).

**Repository**: {{repoOwner}}/{{repoName}}

## 🎯 Mission

Generate a well-structured technical wiki that enables developers to quickly understand this codebase's architecture, patterns, and development practices. This wiki will serve as the primary onboarding resource for new developers and a reference guide for the team.

## 📋 Core Principles

**Throughout this analysis:**

1. **Evidence-Based Documentation**: Every statement must reference actual code (file:line format)
2. **Pattern Recognition**: Identify and document recurring patterns across the codebase
3. **Historical Context**: Leverage commit history to understand evolution and intent
4. **Practical Focus**: Prioritize actionable information over theoretical descriptions
5. **Progressive Disclosure**: Track progress with TodoWrite at each phase

**Quality Standards for All Outputs:**
- ✅ Include file paths with line numbers: \`src/auth/service.ts:45\`
- ✅ Use real class/function names from the code
- ✅ Explain WHY, not just WHAT
- ✅ Use Mermaid diagrams for complex relationships
- ✅ Mark uncertainties: "⚠️ Needs verification"
- ✅ Flag areas for deeper analysis: "🚧 TODO: Deep dive into [topic]"

## 🔄 Analysis Workflow

The analysis follows a deliberate sequence: understand the project's evolution through commits, then explore its current structure, map its architecture, and finally synthesize everything into comprehensive documentation.

---

### Phase 0: Commit History Analysis (15-20 min)

**🎯 Objective**: Understand the codebase's evolution, development patterns, and team practices by analyzing recent commit history.

**📝 Track Progress with TodoWrite:**
1. Fetching recent commit history
2. Analyzing individual commits
3. Identifying code patterns and evolution
4. Documenting development practices

**🔍 Data Collection:**

First, gather commit data (prioritize recency):
\`\`\`bash
# Get last week's commits (preferred)
git log --since="1 week ago" --pretty=format:"%H|%an|%ad|%s" --date=short

# Or ensure at least 30 commits
git log -n 30 --pretty=format:"%H|%an|%ad|%s" --date=short
\`\`\`

For each commit, analyze changes:
\`\`\`bash
git show <commit-hash> --stat  # Get file change statistics
git show <commit-hash>          # Get full diff
\`\`\`

**📄 Outputs:**

**Per-Commit Analysis** (\`~/workspace/.uspark/wiki/commits/<commit-hash>.md\`):

1. **Change Summary**: Files modified, lines added/removed, change scope
2. **Purpose & Intent**: Why this change was made (infer from message and diff)
3. **Core Concepts**: Domain concepts, entities, or features involved
4. **Code Patterns**: Design patterns, architectural patterns, coding idioms
5. **Code Style**: Formatting conventions, naming patterns, comment practices
6. **Technical Decisions**: Framework usage, library choices, API design approaches
7. **Impact Area**: Affected modules, features, or system components
8. **Quality Indicators**: Tests modified, documentation updated, type safety improved

**Synthesis Document** (\`~/workspace/.uspark/wiki/commits/00-SUMMARY.md\`):

- **Commit Overview**: Timeline and scope of analyzed changes
- **Common Patterns**: Recurring implementation patterns across commits
- **Coding Standards**: Observed conventions for naming, structure, comments
- **Architectural Decisions**: Major decisions revealed through commit evolution
- **Active Development Areas**: Modules receiving frequent updates
- **Team Practices**: Commit message format, code review patterns, workflow indicators

**🔗 Downstream Value**: These insights will inform all subsequent phases—use them to understand the project's philosophy, standards, and current focus areas.

---

### Phase 1: Project Discovery (10-15 min)

**🎯 Objective**: Map the project's structure, tech stack, and organizational patterns to understand its type, scale, and primary components.

**📝 Track Progress with TodoWrite:**
1. Scanning project structure
2. Identifying tech stack and dependencies
3. Mapping core modules and entry points
4. Understanding project type and scale

**🔍 Data Collection:**

**Project Metadata & Dependencies:**
- Read package.json / requirements.txt / go.mod / Cargo.toml / etc.
- Identify frameworks, major libraries, and their versions
- Note build tools, test runners, and development tooling

**Directory Structure:**
- Scan with \`tree -L 3\` or \`ls -R\` to understand layout
- Identify common patterns: src/, lib/, app/, tests/, config/, etc.
- Note monorepo indicators (workspaces, packages/)

**Entry Points & Project Type:**
- Locate main entry files (main.ts, index.js, cmd/main.go, app.py, etc.)
- Determine project type: web app, library, CLI tool, microservice, mobile app, etc.
- Identify build artifacts and output targets

**Cross-Reference with Phase 0:**
- Which directories appear most in recent commits? (active development areas)
- What dependencies were recently added/updated? (current technical focus)
- Do commit patterns suggest specific architectural approaches?

**📄 Key Findings to Document:**
- Project type and primary purpose
- Tech stack with versions
- Directory organization philosophy
- Entry points and execution flow
- Development toolchain
- Scale indicators (file count, LoC estimates)

---

### Phase 2: Architecture Mapping (15-20 min)

**🎯 Objective**: Deep-dive into the codebase to understand architectural patterns, module boundaries, data flow, and system design decisions.

**📝 Track Progress with TodoWrite:**
1. Analyzing module organization
2. Mapping component dependencies
3. Understanding data flow patterns
4. Documenting architectural decisions

**🔍 Data Collection:**

**Module Organization:**
- Read key files in each major module/directory
- Understand module boundaries and responsibilities
- Document module dependencies (what imports what)
- Identify layering patterns (presentation, business logic, data access)

**Key Architectural Elements:**
- **Configuration Management**: How are environment variables, configs handled?
- **State Management**: Redux, Context, Zustand, or other patterns?
- **API Structure**: REST endpoints, GraphQL schemas, RPC definitions
- **Database Design**: Schema files, ORM models, migration patterns
- **Authentication/Authorization**: How is security implemented?
- **Error Handling**: Centralized error handling or scattered try-catch?

**Data Flow Patterns:**
- Request/response cycles
- Event propagation
- State updates and synchronization
- Data transformation pipelines

**Cross-Reference with Phase 0:**
- Which architectural patterns appear in recent commits?
- Are there architectural refactoring trends?
- Do commits reveal pain points or technical debt?

**📄 Key Findings to Document:**
- **All findings must reference specific files with line numbers**
- Architectural patterns used (with code examples)
- Module dependency graph
- Critical paths and data flows
- Configuration and deployment patterns
- Areas of complexity or technical debt

---

### Phase 3: Wiki Generation (20-30 min)

**🎯 Objective**: Synthesize all findings from Phases 0-2 into a comprehensive, interconnected wiki that serves as the authoritative technical documentation.

**📝 Track Progress with TodoWrite:**
1. Creating wiki directory structure
2. Writing homepage and navigation
3. Documenting architecture and patterns
4. Creating developer guides
5. Documenting improvements and tech debt

**🔍 Synthesis Strategy:**

As you write each wiki page:
- **Integrate Phase 0 insights**: Reference commits that implemented features, show evolution
- **Use Phase 1 findings**: Include accurate tech stack, structure info
- **Apply Phase 2 analysis**: Document actual architectural patterns with code references
- **Cross-link pages**: Create a web of interconnected documentation
- **Stay evidence-based**: Every claim needs a code reference

---

## 📚 Required Wiki Files

Create all files in **~/workspace/.uspark/wiki/** following this structure:

### 1. 🏠 00-README.md - Wiki Homepage

**Purpose**: Entry point that orients readers and provides navigation to all documentation.

**Required Content:**
- Project name and brief description (2-3 sentences)
- Complete table of contents with links to all wiki pages
- Tech stack at a glance (from Phase 1)
- Project statistics: file count, LoC estimate, key directories
- Link to commit analysis: \`commits/00-SUMMARY.md\`

**Structure:**
\`\`\`markdown
# {{repoName}} Technical Wiki
> 🏗️ Auto-generated technical documentation

## 📚 Table of Contents
[Links to 01-architecture.md, 02-quick-start.md, etc.]

## 🎯 Project Overview
[2-3 sentence description based on Phase 1 & 2 findings]

## 🛠️ Tech Stack
[Frameworks, languages, key libraries from Phase 1]

## 📊 Project Stats
- Files: X
- Key Directories: Y
- Primary Language: Z

## 📝 Recent Development Activity
See [Commit Analysis Summary](commits/00-SUMMARY.md) for recent changes and patterns.
\`\`\`

### 2. 🏗️ 01-architecture.md - Architecture Overview

**Purpose**: Explain the system's high-level design, key architectural decisions, and structural patterns.

**Required Content:**
- System architecture description (from Phase 2)
- High-level component diagram (Mermaid)
- Module dependency graph (Mermaid)
- Design patterns used (with file:line references from Phase 2)
- Architecture evolution (link relevant commits from Phase 0)

**Integration:**
- Reference commits that introduced major architectural changes
- Link to specific modules documented in 03-modules.md
- Cross-reference with 07-improvements.md for architectural debt

**Format for Architectural Decisions:**
\`\`\`markdown
### [Decision Name]
**Location**: \`path/to/file.ts:123\`
**Pattern**: [e.g., Repository Pattern, Observer, etc.]
**Why**: [reasoning from code/comments/commits]
**Trade-offs**: [any limitations or downsides observed]
**Evolution**: See commit [abc123] for introduction, [def456] for refinement
\`\`\`

---

### 3. 🚀 02-quick-start.md - Getting Started

**Purpose**: Enable new developers to set up and run the project within minutes.

**Required Content:**
- Prerequisites (language versions, tools required)
- Installation steps (from package.json, README, or manifest files)
- How to run locally (dev server, build commands from Phase 1)
- Project directory structure with explanations (from Phase 1)
- Key entry points and their purposes (from Phase 1)
- Common first tasks (from Phase 0 commit patterns)

**Integration:**
- Use actual commands from package.json/Makefile
- Reference development practices from commits/00-SUMMARY.md
- Link to 06-development.md for deeper development workflows

---

### 4. 📦 03-modules.md - Module Structure

**Purpose**: Document each major module's responsibility, contents, and relationships.

**Required Content:**
- List of all core modules/directories (from Phase 1 & 2)
- For each module:
  * **Purpose**: What problem does it solve?
  * **Key Files**: With file:line references to important classes/functions
  * **Dependencies**: What other modules does it import?
  * **Consumers**: What uses this module?
  * **Recent Activity**: Link to commits that modified this module (Phase 0)
- Module dependency graph (Mermaid)
- Import conventions observed in code (from Phase 0 code style analysis)

**Integration:**
- Reference architectural patterns from 01-architecture.md
- Identify frequently changed modules from commits/00-SUMMARY.md
- Cross-link to API endpoints in 04-api.md where applicable

---

### 5. 🌐 04-api.md - API Documentation (if applicable)

**Purpose**: Catalog all API endpoints, their contracts, and usage patterns.

**Required Content:**
- API type (REST, GraphQL, gRPC, etc.) identified in Phase 2
- For each endpoint:
  * **HTTP Method & Path** (or GraphQL query/mutation)
  * **Location**: File:line where handler is defined
  * **Purpose**: What does this endpoint do?
  * **Authentication**: Required auth (from Phase 2 security analysis)
  * **Parameters**: Request body/query params with types
  * **Response**: Response format and status codes
  * **Example**: Real usage example from tests or code
- GraphQL schema if applicable
- API evolution: Recent endpoint additions from Phase 0

**Integration:**
- Link to relevant modules in 03-modules.md
- Reference authentication patterns from 01-architecture.md
- Note API changes from recent commits

---

### 6. 🗄️ 05-database.md - Database Design (if applicable)

**Purpose**: Document database schema, relationships, and data management patterns.

**Required Content:**
- Database type (PostgreSQL, MongoDB, etc.) from Phase 2
- ORM/query tool (Drizzle, Prisma, SQLAlchemy, etc.) from Phase 1
- Table schemas with:
  * Column definitions with types
  * Constraints (primary keys, foreign keys, unique, etc.)
  * Indexes
  * Relationships between tables
- ER diagram (Mermaid)
- Migration strategy and tooling
- Query patterns observed in code (from Phase 2)
- Recent schema changes (from Phase 0 commits)

**Integration:**
- Link to data access modules in 03-modules.md
- Reference database configuration in 01-architecture.md
- Note schema evolution from commit analysis

---

### 7. 👨‍💻 06-development.md - Development Guide

**Purpose**: Guide developers through daily workflows, coding standards, and best practices.

**Required Content:**

**Development Workflow:**
- Standard development process (observed in commit patterns)
- Branch naming conventions (from git history in Phase 0)
- Testing workflow (from package.json and Phase 1)
- Code review practices (if evident from commits)

**Tooling:**
- Testing commands (from package.json/Makefile)
- Linting and formatting tools (from Phase 1)
- Pre-commit hooks (if configured)
- Build and deployment commands

**Code Style Guide** (derived from Phase 0 commit analysis):
- **Naming Conventions**: Based on actual code patterns in recent commits
- **File Organization**: How to structure new files/modules
- **Comment Style**: Documentation practices observed in code
- **Testing Patterns**: How tests are structured (from test files in Phase 2)
- **Import Organization**: Conventions for import statements

**Commit Message Format**: Pattern observed from Phase 0 analysis

**Common Tasks with Step-by-Step Instructions:**
- Adding new features (with file:line examples)
- Adding API endpoints (reference 04-api.md patterns)
- Adding database tables (reference 05-database.md migration process)
- Running and writing tests
- Debugging techniques (based on code patterns)

**Integration:**
- Reference architectural patterns from 01-architecture.md
- Link to module structure in 03-modules.md
- Use actual examples from recent commits in Phase 0

---

### 8. 🔧 07-improvements.md - Tech Debt & Improvements

**Purpose**: Document known issues, technical debt, and opportunities for improvement to guide future development.

**Required Content:**

**🔴 Critical Issues:**
- Security vulnerabilities (from dependency checks in Phase 1)
- Major bugs or design flaws (with file:line references)
- Breaking changes needed

**🟡 Technical Debt:**
- Deprecated dependencies (from Phase 1)
- Missing test coverage (from Phase 2 analysis)
- Code complexity hotspots (from Phase 2)
- **Patterns from commits**: Repeated fixes suggesting underlying issues (Phase 0)
- Inconsistent patterns across the codebase

**🟢 Enhancement Opportunities:**
- Performance optimizations (based on code analysis in Phase 2)
- Code quality improvements (based on patterns in Phase 0)
- **Refactoring candidates**: Areas with frequent changes that need stabilization (Phase 0)
- Missing features or incomplete implementations

**📈 Improvement Roadmap:**
- **Quick Wins** (1-2 days): Small fixes with immediate impact
- **Medium Effort** (1 week): Significant improvements requiring planning
- **Large Projects** (2+ weeks): Major refactors or new features

**📊 Development Velocity Insights** (from Phase 0):
- Most frequently changed files (potential churn indicators)
- Areas of active development (current team focus)
- Stable vs. volatile modules
- Potential refactoring candidates based on change frequency

**Integration:**
- Reference architectural patterns that need improvement from 01-architecture.md
- Link to specific modules in 03-modules.md
- Connect to specific commits in Phase 0 analysis
- Prioritize based on actual pain points observed in code and commits

---

## 🎬 Execution Guidelines

**Before You Start:**
1. ✅ **Create todo list**: Use TodoWrite to track all phases
2. ✅ **Follow the sequence**: Phase 0 → Phase 1 → Phase 2 → Phase 3 (do not skip or reorder)
3. ✅ **Read actual code**: Never guess or assume—every statement needs code evidence
4. ✅ **Cross-reference phases**: Continuously integrate insights from earlier phases into later ones

**Writing Standards (applies to all outputs):**

**Specificity Examples:**
- ❌ Bad: "The app uses a database"
- ✅ Good: "Uses PostgreSQL 14 with Drizzle ORM (src/db/index.ts:12)"

- ❌ Bad: "Authentication is handled securely"
- ✅ Good: "JWT authentication with refresh tokens (src/auth/jwt.ts:45-67), see commit abc123 for implementation"

**Cross-Referencing:**
- Link between wiki pages liberally
- Reference specific commits when documenting features
- Connect architectural decisions to the commits that implemented them
- Use actual code patterns from Phase 0 when documenting standards

**Diagrams:**
- Use Mermaid for architecture, flows, ER diagrams, and dependency graphs
- Keep diagrams simple and focused
- Annotate diagrams with file references

**Continuous Improvement:**
- Mark uncertainties: "⚠️ Needs verification: Unclear if X handles Y"
- Flag areas needing deeper analysis: "🚧 TODO: Deep dive into error propagation in module X"
- Document assumptions: "📝 Assumption: Based on commit patterns, this appears to be..."

**Technical Details:**
- All files auto-sync to uSpark via watch-claude
- Wiki location: \`~/workspace/.uspark/wiki/\`
- Commit analysis location: \`~/workspace/.uspark/wiki/commits/\`

---

## 🚀 Begin Your Comprehensive Analysis!

Start with Phase 0 (Commit History Analysis) and work through each phase systematically. Use TodoWrite to track your progress, and remember: evidence-based documentation is the key to creating a truly valuable technical wiki.`;

export function generateInitialScanPrompt(
  repoOwner: string,
  repoName: string,
): string {
  return INITIAL_SCAN_PROMPT.replace("{{repoOwner}}", repoOwner).replace(
    "{{repoName}}",
    repoName,
  );
}
