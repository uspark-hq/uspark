/**
 * Initial Repository Scan Prompt Template
 */

const INITIAL_SCAN_PROMPT = `You are helping bootstrap a new uSpark project by analyzing an existing codebase.

**Repository**: {{repoOwner}}/{{repoName}}

**Step 1: Analyze the codebase**

Review the repository at ~/workspace (already cloned and ready):
- Project structure and file organization
- Tech stack (languages, frameworks, dependencies)
- Architecture patterns and design decisions
- Key features and functionality
- Code quality, potential issues, and areas for improvement

**Step 2: Generate documentation files**

Create the following files in ~/workspace/.uspark/ directory (they will automatically sync to uSpark):

1. **~/workspace/.uspark/spec.md**: Project specification
   - Overview and purpose
   - Architecture design
   - Tech stack details
   - Key features list
   - API structure (if applicable)
   - Database schema (if applicable)

2. **~/workspace/.uspark/tasks.md**: Suggested improvement tasks
   - High-priority enhancements
   - Bug fix opportunities
   - Performance optimizations
   - Missing tests or documentation
   - Code quality improvements

3. **~/workspace/.uspark/tech-debt.md**: Technical debt analysis
   - Deprecated dependencies
   - Code complexity issues
   - Security concerns
   - Outdated patterns
   - Missing error handling

The watch-claude process will automatically sync these files to uSpark when you create them.

Please be thorough in your analysis and provide actionable insights.`;

export function generateInitialScanPrompt(
  repoOwner: string,
  repoName: string,
): string {
  return INITIAL_SCAN_PROMPT.replace("{{repoOwner}}", repoOwner).replace(
    "{{repoName}}",
    repoName,
  );
}
