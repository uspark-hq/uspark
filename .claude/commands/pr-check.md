# PR Check Command

Automated PR review, pipeline monitoring, issue fixing, and merging workflow.

## Usage

```
/pr-check [pr-id]
```

## Parameters

- `pr-id`: (Optional) GitHub PR number. If not provided, uses the current branch's PR

## Workflow

When this command is executed, perform the following steps in order:

### Step 1: Identify Target PR

1. If `pr-id` is provided, use that PR
2. Otherwise, get the current branch using `git branch --show-current`
3. Find the PR for current branch: `gh pr list --head {branch} --json number --jq '.[0].number'`
4. If no PR found, exit with error

### Step 2: Run Code Review

Execute the code review workflow from `/code-review` command:
1. Run `/code-review {pr-id}` 
2. This will analyze the PR based on criteria in `code-review.md`
3. Generate review reports in `commit-list.md` and individual `review-*.md` files
4. Continue regardless of review findings (reviews are informational)

### Step 3: Wait for Pipeline

Wait 60 seconds for the pipeline to complete or stabilize:
- This allows CI/CD to process recent commits
- Display countdown: "Waiting: XX seconds remaining"

### Step 4: Check Pipeline Status

Check the pipeline status using: `gh pr checks {pr-id}`

Possible outcomes:
- **All passing**: Continue to merge step
- **Failures detected**: Proceed to fix attempts
- **Still running**: Wait 30 seconds and retry (up to 3 times)

### Step 5: Fix Detected Issues

Based on failure types, attempt automatic fixes:

#### For Lint Failures (if output contains "lint" and "fail"):
1. Navigate to turbo directory: `cd turbo` (or stay if already there)
2. Run formatter: `pnpm format`
3. If changes detected:
   - Stage changes: `git add -A`
   - Commit: `git commit -m "fix: auto-format code"`
   - Push: `git push`
4. Wait 60 seconds for pipeline to restart

#### For Test Failures (if output contains "test" and "fail"):
1. Navigate to turbo directory
2. Run tests locally: `pnpm vitest run`
3. Report whether tests pass locally or need manual fix
4. Note: If tests pass locally but fail in CI, it may be an environment issue

#### For Type Check Failures (if output contains "type" or "check-types" and "fail"):
1. Navigate to turbo directory
2. Run type checks: `pnpm check-types`
3. Report results (manual fix usually required)

After any successful fix:
- Reset retry counter
- Wait for pipeline to process the fix
- Re-check pipeline status

### Step 6: Final Verification

After fixes (or if no fixes needed):
1. Run final pipeline check: `gh pr checks {pr-id}`
2. If still failing after 3 retry attempts, exit with error
3. If passing, proceed to merge

### Step 7: Merge the PR

If all checks pass, execute merge workflow:

1. Check if merge queue is enabled: `gh api "repos/{owner}/{repo}" --jq '.merge_queue_enabled'`
2. If merge queue enabled: `gh pr merge {pr-id} --auto`
3. Otherwise: `gh pr merge {pr-id} --squash --delete-branch`
4. After successful merge:
   - Switch to main: `git checkout main`
   - Pull latest: `git pull origin main`
   - Confirm on latest main

## Configuration

- **Initial wait**: 60 seconds after code review
- **Retry attempts**: Maximum 3 times
- **Retry delay**: 30 seconds between attempts
- **Fix wait**: 60 seconds after pushing fixes

## Error Conditions

Exit with error if:
- No PR exists for current branch
- Pipeline checks fail after all retry attempts
- Unable to find turbo directory for fixes
- Merge operation fails

## Success Criteria

Command succeeds when:
- All pipeline checks pass (with or without fixes)
- PR is successfully merged
- Branch switched back to main

## Example Output

```
🔍 Starting automated PR check workflow...
✓ Found PR #123 for current branch

📝 Step 1: Running code review for PR #123...
✓ Code review completed

⏱️ Step 2: Waiting 60 seconds for pipeline to complete...
✓ Wait completed

🔄 Checking pipeline status...
❌ Pipeline has failures:
lint    fail    ...

🔧 Attempting to fix lint issues...
Running pnpm format...
✓ Code formatted successfully
✓ Fixes pushed to remote

⏳ Waiting for pipeline to restart after fixes...
🔄 Checking pipeline status...
✓ All pipeline checks passed!

🎉 Step 4: All checks passed! Proceeding to merge...
🔀 Merging PR directly...
✅ PR #123 successfully merged!

🔄 Switching to main branch...
✓ Now on latest main branch

🎉 PR check workflow completed successfully!
```

## Notes

- This command combines review, monitoring, fixing, and merging into one workflow
- Designed for the project's specific CI/CD setup
- Automatically handles common issues that can be fixed programmatically
- Respects merge queue settings if enabled
- Preserves commit messages in squash merge