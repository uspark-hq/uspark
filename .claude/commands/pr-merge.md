# Merge PR Command

This command automates the process of merging a pull request after ensuring all checks pass.

## What this command does:

1. **Check PR Status**
   - Run `gh pr checks` to see if all GitHub Actions are passing
   - If any checks are failing, wait 30 seconds and check again (up to 3 retries)
   - If checks continue to fail after retries, abort with error message

2. **Update PR Information**
   - Fetch latest changes from origin: `git fetch origin`
   - Compare current branch with origin/main: `git diff origin/main...HEAD`
   - Update PR title and body based on the changes (if needed)
   - Show a summary of what will be merged

3. **Merge the PR**
   - If merge queue is enabled: Use `gh pr merge --auto` to queue the PR for merge
   - If merge queue is disabled: Use `gh pr merge --squash --delete-branch`
   - The merge queue will handle the merge strategy and branch deletion automatically
   - Wait for merge to complete (may take a few moments if queued)

4. **Switch to Latest Main**
   - After successful merge: `git checkout main`
   - Pull latest changes: `git pull origin main`
   - Confirm we're on the latest commit

## Usage

Just say: "merge this PR" or "/merge"

## Prerequisites

- Must be on a feature branch with an open PR
- GitHub CLI (`gh`) must be installed and authenticated
- Must have permission to merge PRs in the repository

## Example workflow:

```bash
# 1. Check current PR status
gh pr checks

# 2. If all green, fetch and compare
git fetch origin
git diff origin/main...HEAD --stat

# 3. Merge (auto-detects merge queue)
gh pr merge --auto  # If merge queue is enabled
# OR
gh pr merge --squash --delete-branch  # If merge queue is disabled

# 4. Switch to main
git checkout main
git pull origin main
```

## Error handling:

- If no PR exists for current branch: Show error and exit
- If checks are failing: Show which checks failed and wait/retry
- If merge conflicts exist: Show conflict details and request manual resolution
- If merge fails: Show error and keep branch intact

## Options:

The command uses these defaults:
- Merge strategy: `--squash` (combine all commits into one)
- Branch deletion: `--delete-branch` (clean up after merge)
- Auto-confirm: Yes (no manual confirmation needed if all checks pass)

## Notes:

- This command is designed for the project's workflow where PRs are typically squash-merged
- If merge queue is enabled on the repository:
  - Cannot use `--delete-branch` flag (merge queue handles branch deletion)
  - Merge strategy is controlled by merge queue settings
  - Use `gh pr merge --auto` to add PR to the merge queue
- The PR's commit message will be preserved in the squash commit
- Branch protection rules (if any) are respected