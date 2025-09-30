---
command: pr-create
description: Commit changes and create a pull request with automated quality checks
---

Automates the complete workflow of committing changes and creating pull requests.

Usage: `/pr-create [commit-message]`
- If commit-message is provided, uses it directly
- If no argument is given, analyzes changes and suggests appropriate commit message

The workflow includes:
1. Check current branch status and create new branch if needed
2. Run pre-commit quality checks (format, lint, type check, tests)
3. Stage and commit changes with proper conventional commit message
4. Push changes to remote
5. Create pull request (if new branch)
6. Return PR URL

This command delegates to the `pr-creator` sub-agent for execution.

```agent
subagent_type: pr-creator

Analyze the current git status and changes, then execute the complete PR creation workflow.

{{#if commit_message}}
Use this commit message (validate it follows conventional commits format):
{{commit_message}}
{{else}}
Analyze the changes and suggest an appropriate commit message following conventional commits format.
{{/if}}

Follow these steps:
1. Check current branch and PR status
2. Create new feature branch if needed (on main or PR merged)
3. Run pre-commit checks: cd turbo && pnpm install && format/lint/type-check/test
4. Fix any issues found during checks
5. Stage all changes and commit with proper message
6. Push to remote (with -u flag if new branch)
7. Create PR if new branch or update existing PR
8. Return the PR URL

Provide a clear summary of all actions taken and the final PR URL.
```