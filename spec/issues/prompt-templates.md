# Prompt Templates Technical Specification

## Overview

This document defines the prompt template system for MVP Story 3: Task Generation and AI Control. The system enables users to quickly generate structured tasks with optimized prompts that control Claude Code execution.

## Core Requirements

### 1. Template Library

Pre-defined templates for common AI coding management tasks:

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'planning' | 'implementation' | 'review';
  template: string;
  variables: TemplateVariable[];
  expectedOutput: 'task' | 'spec' | 'report';
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'file' | 'context';
  required: boolean;
  default?: string;
  description: string;
}
```

### 2. Core Templates for MVP

#### 2.1 Analyze Architecture
```markdown
Analyze the codebase architecture for {{projectName}}:

Context:
- Repository: {{githubUrl}}
- Technology stack: {{techStack}}
- Current files: {{fileTree}}

Please provide:
1. High-level architecture overview
2. Key components and their relationships
3. Design patterns used
4. Potential architectural issues
5. Scalability concerns

Output format: Markdown document with sections for each topic
```

#### 2.2 Break Down Feature
```markdown
Break down the following feature into implementable tasks:

Feature: {{featureName}}
Description: {{featureDescription}}
Current codebase context: {{codebaseContext}}

Requirements:
- Each task should be completable by AI in one session
- Include clear acceptance criteria
- Consider dependencies between tasks
- Estimate complexity (simple/medium/complex)

Output format: Task list with:
- Task title
- Description
- Acceptance criteria
- Dependencies
- Complexity rating
```

#### 2.3 Review Technical Debt
```markdown
Review the codebase for technical debt:

Repository: {{githubUrl}}
Recent commits: {{recentCommits}}
Known issues: {{knownIssues}}

Analyze:
1. Code quality issues
2. Outdated dependencies
3. Missing tests
4. Performance bottlenecks
5. Security vulnerabilities

For each issue, provide:
- Severity (critical/high/medium/low)
- Impact on development velocity
- Estimated effort to fix
- Recommended solution

Output format: Technical debt registry as markdown table
```

#### 2.4 Generate Implementation Plan
```markdown
Create an implementation plan for: {{taskName}}

Context:
- Current code: {{relevantFiles}}
- Constraints: {{constraints}}
- Success criteria: {{successCriteria}}

Provide:
1. Step-by-step implementation approach
2. Files to modify/create
3. Key code snippets
4. Testing strategy
5. Potential risks and mitigations

Output format: Structured implementation guide
```

### 3. Variable Injection System

```typescript
interface TemplateContext {
  projectId: string;
  projectName: string;
  githubUrl?: string;
  techStack?: string[];
  fileTree?: string;
  codebaseContext?: string;
  recentCommits?: Commit[];
  customVariables?: Record<string, any>;
}

function renderTemplate(
  template: PromptTemplate,
  context: TemplateContext
): string {
  // Replace {{variable}} with actual values
  // Handle missing optional variables gracefully
  // Validate required variables
}
```

### 4. Integration with Chat Interface

```typescript
interface PromptQuickAction {
  templateId: string;
  label: string;
  icon: string;
  hotkey?: string;
}

// UI Component
function PromptTemplatePanel() {
  // Display categorized templates
  // One-click insertion
  // Variable input dialog if needed
  // Preview before sending
}
```

### 5. Task Document Generation

When Claude responds to a template prompt, automatically:

1. Parse the response for structured content
2. Create appropriate document type:
   - `/tasks/{{timestamp}}-{{feature}}.md` for task breakdowns
   - `/specs/architecture/{{component}}.md` for architecture docs
   - `/debt/registry.md` for technical debt (append/update)
3. Link documents to the session
4. Track completion status

```typescript
interface GeneratedDocument {
  sessionId: string;
  templateId: string;
  filePath: string;
  documentType: 'task' | 'spec' | 'report';
  status: 'draft' | 'reviewed' | 'approved';
  metadata: {
    generatedAt: Date;
    variables: Record<string, any>;
    claudeResponse: string;
  };
}
```

## Implementation Plan

### Phase 1: Backend (Week 1)
1. Template storage schema
2. Variable injection engine
3. Template API endpoints:
   - `GET /api/templates` - List all templates
   - `GET /api/templates/:id` - Get template details
   - `POST /api/templates/:id/render` - Render with variables

### Phase 2: Frontend Integration (Week 1)
1. Template selection UI
2. Variable input dialog
3. One-click insertion into chat
4. Template preview

### Phase 3: Document Generation (Week 2)
1. Response parser for different template types
2. Automatic document creation
3. Status tracking
4. Document linking to sessions

### Phase 4: Testing & Refinement (Week 2)
1. Test with real projects
2. Refine templates based on Claude output quality
3. Add more templates based on user needs

## Technical Considerations

### 1. Template Storage
- Store in database for easy updates
- Version control for templates
- Allow custom templates (post-MVP)

### 2. Variable Sources
- Pull from project context automatically
- Allow manual override
- Cache frequently used values

### 3. Output Parsing
- Use structured markers in prompts
- Handle variations in Claude responses
- Fallback to manual document creation

### 4. Performance
- Cache rendered templates
- Lazy load template library
- Minimize API calls for context

## Success Metrics

1. **Template Usage**: >80% of Claude sessions start with template
2. **Task Generation Success**: >70% of generated tasks are actionable
3. **Time Savings**: 50% reduction in prompt crafting time
4. **Document Quality**: Generated documents require <20% manual editing

## Dependencies

- Claude Sessions API (exists but needs integration)
- E2B container with Claude Code
- YJS document system
- GitHub integration for context

## Risks & Mitigations

1. **Risk**: Claude responses vary in structure
   - **Mitigation**: Use clear output format instructions, fallback to manual parsing

2. **Risk**: Templates become outdated
   - **Mitigation**: Version control, regular review cycle

3. **Risk**: Variable context is incomplete
   - **Mitigation**: Graceful degradation, manual input options

## Post-MVP Enhancements

1. Custom template creation UI
2. Template sharing between projects
3. AI-powered template suggestions
4. Multi-step template workflows
5. Integration with other AI tools (Cursor, Windsurf)