---
command: pr-merge
description: Merge a pull request after validating all CI checks pass
---

Automates the complete workflow of merging a pull request with safety checks.

Usage: `/pr-merge`
- Must be on a feature branch with an open PR
- Validates all CI checks pass before merging
- Uses auto-merge (merge queue) for safe merging
- Automatically switches to main and pulls latest changes

The workflow includes:
1. Check PR status and validate all CI checks pass
2. Retry pending/failing checks (up to 3 times with 30s intervals)
3. Fetch latest changes and show diff summary
4. Merge PR using auto-merge (merge queue)
5. Switch to main branch and pull latest changes
6. Confirm successful merge with latest commit info

This command delegates to the `pr-merger` sub-agent for execution.

```agent
subagent_type: pr-merger

Execute the complete PR merge workflow with safety checks.

Follow these steps:
1. Check if PR exists for current branch
2. Validate all CI checks pass (retry up to 3 times if pending/failing)
3. Abort if checks still failing after retries
4. Fetch latest changes from origin
5. Show diff summary and PR information
6. Merge PR using `gh pr merge --auto` (respects merge queue)
7. Wait for merge to complete (check PR state)
8. Switch to main branch
9. Pull latest changes
10. Show latest commit to confirm success

Provide a clear summary of all checks, actions taken, and final status.

If any step fails:
- Clearly report the error
- Show which checks failed (with URLs)
- Provide actionable next steps
- Do not proceed if CI checks fail
```