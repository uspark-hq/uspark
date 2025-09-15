# Prompt Templates Technical Specification (MVP Simplified)

## Overview

For MVP, prompt templates are hardcoded in the frontend to validate the concept quickly. No backend storage or API is needed. This document defines the templates and their integration into the chat interface.

## Core Requirements

### 1. Hardcoded Template Structure

Templates are defined directly in the frontend code:

```typescript
// components/chat/prompt-templates.ts
export const PROMPT_TEMPLATES = {
  analyzeArchitecture: {
    label: "Analyze Architecture",
    icon: "🏗️",
    template: `Analyze the codebase architecture for {{projectName}}:

Context:
- Repository: {{githubUrl}}

Please provide:
1. High-level architecture overview
2. Key components and their relationships
3. Design patterns used
4. Potential architectural issues
5. Scalability concerns

Output format: Markdown document with sections for each topic`,
  },
  breakDownFeature: {
    label: "Break Down Feature",
    icon: "📝",
    template: `Break down the following feature into implementable tasks:

Feature: [DESCRIBE FEATURE HERE]

Requirements:
- Each task should be completable by AI in one session
- Include clear acceptance criteria
- Consider dependencies between tasks
- Estimate complexity (simple/medium/complex)

Output format: Task list with title, description, acceptance criteria, dependencies, and complexity rating`,
  },
  reviewTechnicalDebt: {
    label: "Review Technical Debt",
    icon: "🔍",
    template: `Review the codebase for technical debt:

Repository: {{githubUrl}}

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

Output format: Technical debt registry as markdown table`,
  },
  generateImplementation: {
    label: "Generate Implementation Plan",
    icon: "🚀",
    template: `Create an implementation plan for: [DESCRIBE TASK HERE]

Provide:
1. Step-by-step implementation approach
2. Files to modify/create
3. Key code snippets
4. Testing strategy
5. Potential risks and mitigations

Output format: Structured implementation guide`,
  }
} as const;
```

### 2. Core Templates for MVP

All four templates are embedded directly in the frontend code above. No database or API required.

### 3. Simple Variable Replacement

For MVP, use basic string replacement:

```typescript
// components/chat/use-prompt-template.ts
function insertTemplate(templateKey: keyof typeof PROMPT_TEMPLATES) {
  const template = PROMPT_TEMPLATES[templateKey];

  // Get basic context from current project
  const projectName = getCurrentProject()?.name || "[Project Name]";
  const githubUrl = getCurrentProject()?.github_url || "[GitHub URL]";

  // Simple replacement
  let prompt = template.template
    .replace(/\{\{projectName\}\}/g, projectName)
    .replace(/\{\{githubUrl\}\}/g, githubUrl);

  // Insert into chat input
  setChatInput(prompt);
}
```

### 4. Chat Interface Integration

```tsx
// components/chat/template-buttons.tsx
function TemplateButtons({ onInsert }: { onInsert: (text: string) => void }) {
  const project = useCurrentProject();

  const handleTemplateClick = (key: keyof typeof PROMPT_TEMPLATES) => {
    const template = PROMPT_TEMPLATES[key];
    const prompt = template.template
      .replace(/\{\{projectName\}\}/g, project?.name || "[Project Name]")
      .replace(/\{\{githubUrl\}\}/g, project?.github_url || "[GitHub URL]");
    onInsert(prompt);
  };

  return (
    <div className="flex gap-2 p-2 border-t">
      {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
        <button
          key={key}
          onClick={() => handleTemplateClick(key as keyof typeof PROMPT_TEMPLATES)}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          title={template.label}
        >
          {template.icon} {template.label}
        </button>
      ))}
    </div>
  );
}
```

### 5. Usage Flow

1. User clicks template button
2. Template text (with variables replaced) appears in chat input
3. User can edit the prompt if needed (e.g., fill in [DESCRIBE FEATURE HERE])
4. User sends prompt to Claude
5. Claude responds with structured output
6. User manually creates documents from Claude's response (automatic generation is post-MVP)

## MVP Implementation

### Frontend Only Implementation
1. Create `prompt-templates.ts` with 4 hardcoded templates
2. Add template buttons above chat input
3. Simple string replacement for variables
4. Test with real prompts

### No Backend Changes Required
- No database schema
- No API endpoints
- No template storage

### Document Generation
- Manual for MVP - user copies Claude output to create documents
- Automatic generation is post-MVP

## MVP Simplifications

### What We're NOT Doing
1. **No template storage** - Hardcoded in frontend
2. **No complex variables** - Just project name and GitHub URL
3. **No output parsing** - Manual document creation
4. **No API endpoints** - Pure frontend feature

### What We ARE Doing
1. **Quick template insertion** - One-click to add prompt
2. **Basic customization** - User can edit after insertion
3. **Validation** - Test that prompts generate useful output
4. **Iteration** - Refine template text based on results

## Success Metrics

1. **Template Usage**: Users try templates in >50% of sessions
2. **Task Generation Success**: Templates produce actionable output
3. **Time Savings**: Faster than writing prompts from scratch
4. **User Feedback**: Templates are helpful and relevant

## MVP Dependencies

- Claude Sessions API (for executing prompts)
- E2B container with Claude Code
- No other dependencies - pure frontend feature

## Risks & Mitigations

1. **Risk**: Templates don't produce good output
   - **Mitigation**: Test and refine template text iteratively

2. **Risk**: Users need more customization
   - **Mitigation**: Allow editing after insertion

3. **Risk**: Templates become stale
   - **Mitigation**: Easy to update in code for MVP

## Post-MVP Enhancements

1. Move templates to backend storage
2. Custom template creation UI
3. Variable system with project context
4. Automatic document generation from Claude output
5. Template versioning and sharing
6. Integration with other AI tools (Cursor, Windsurf)