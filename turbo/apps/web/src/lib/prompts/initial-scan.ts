/**
 * Initial Repository Scan Prompt Template
 *
 * Generates a prompt that instructs Claude to:
 * 1. Clone a GitHub repository
 * 2. Analyze the codebase
 * 3. Generate initial documentation files
 */

export function generateInitialScanPrompt(
  repoOwner: string,
  repoName: string,
): string {
  return `You are helping bootstrap a new uSpark project by analyzing an existing codebase.

**Step 1: Clone the repository**
Run this command (GITHUB_TOKEN is already set in environment):
\`\`\`bash
git clone https://$GITHUB_TOKEN@github.com/${repoOwner}/${repoName}.git $HOME/repo
\`\`\`

**Step 2: Analyze the codebase**
Review the repository at $HOME/repo:
- Project structure and file organization
- Tech stack (languages, frameworks, dependencies)
- Architecture patterns
- Key features and functionality
- Code quality and potential issues

**Step 3: Generate documentation files**
Create these files in the current working directory (they will auto-sync to uSpark):

1. **spec.md**: Project specification
   - Overview and purpose
   - Architecture design
   - Tech stack details
   - Key features list
   - API structure (if applicable)
   - Database schema (if applicable)

2. **tasks.md**: Suggested improvement tasks
   - High-priority enhancements
   - Bug fix opportunities
   - Performance optimizations
   - Missing tests or documentation
   - Code quality improvements

3. **tech-debt.md**: Technical debt analysis
   - Deprecated dependencies
   - Code complexity issues
   - Security concerns
   - Outdated patterns
   - Missing error handling

The watch-claude process will automatically sync these files to uSpark when you're done.

Please be thorough in your analysis and provide actionable insights.`;
}
