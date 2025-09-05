# Git Commit and PR Workflow

This document describes the standard workflow for committing changes and creating pull requests.

## Prerequisites
- GitHub CLI (`gh`) must be installed
- Must be authenticated with GitHub (`gh auth login`)

## Workflow Steps

### 1. Check Current Branch and PR Status
First, check which branch you're currently on and its PR status:
```bash
# Get current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# Check if on main branch
if [ "$current_branch" = "main" ]; then
    echo "⚠️ You're on main branch. A new feature branch will be created."
    need_new_branch=true
else
    # Check if current branch has a PR and if it's merged
    pr_status=$(gh pr view --json state,merged 2>/dev/null)
    if [ $? -eq 0 ]; then
        is_merged=$(echo "$pr_status" | jq -r '.merged')
        pr_state=$(echo "$pr_status" | jq -r '.state')
        
        if [ "$is_merged" = "true" ] || [ "$pr_state" = "MERGED" ]; then
            echo "⚠️ Current branch's PR is already merged. A new feature branch will be created."
            need_new_branch=true
        else
            echo "✓ Current branch's PR is still open. You can continue on this branch."
            need_new_branch=false
        fi
    else
        echo "✓ No PR exists for this branch yet. You can continue on this branch."
        need_new_branch=false
    fi
fi
```

### 2. Branch Strategy
- **If on `main`**: Must create a new feature branch
- **If PR is merged**: Must create a new feature branch
- **If on feature branch with open/no PR**: Continue with current branch

### 3. Create Feature Branch (if needed)
```bash
# Only create new branch if needed (on main or PR merged)
if [ "$need_new_branch" = "true" ]; then
    # First ensure we're on latest main
    git checkout main
    git pull origin main
    
    # Create descriptive branch name
    # Format: type/short-description
    # Examples: fix/typescript-errors, feat/add-cli-command, docs/update-readme
    git checkout -b <branch-name>
fi
```

### 4. Stage, Commit and Push Changes
```bash
# Check status
git status

# Stage all changes
git add -A

# Commit with conventional commit message
git commit -m "<type>: <description>"

# Push to remote (use -u flag if new branch)
git push  # or git push -u origin <branch-name> for new branches

# Display PR link
gh pr view --json url -q .url
```

#### Commit Message Format (Conventional Commits)
Must follow the format: `<type>[optional scope]: <description>`

**Types** (required):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes
- `ci:` CI configuration changes
- `perf:` Performance improvements
- `build:` Build system changes
- `revert:` Revert previous commit

**Rules**:
- Use lowercase for type
- Description must start with lowercase
- No period at the end
- Keep under 100 characters

**Examples**:
- ✅ `fix: resolve TypeScript Worker type error`
- ✅ `feat(cli): add new command for initialization`
- ❌ `Fix: Resolve TypeScript Worker type error.` (wrong case, has period)
- ❌ `fixed TypeScript errors` (missing type)

### 5. Create Pull Request (for new branches)
If you created a new branch, create a PR immediately:
```bash
# Simple PR with just a title (body will be auto-generated from commits)
gh pr create --title "<type>: <description>"

# Or with a brief description
gh pr create --title "<type>: <description>" --body "Brief description of what this PR does"
```

### 6. Get PR Link
After creating or updating a PR, get the link:
```bash
# Get PR URL for the current branch
gh pr view --json url -q .url

# Or open PR in browser
gh pr view --web
```

## Complete Example

### Scenario 1: Starting from main branch
```bash
# Check current branch
git branch --show-current
# Output: main

# Create feature branch
git checkout -b fix/typescript-worker-error

# Make changes, then commit
git add -A
git commit -m "fix: resolve TypeScript Worker type error in CLI package"
git push -u origin fix/typescript-worker-error

# Create PR
gh pr create --title "fix: resolve TypeScript Worker type error in CLI package"

# Get PR link
gh pr view --json url -q .url
```

### Scenario 2: Already on feature branch
```bash
# Check current branch
git branch --show-current
# Output: fix/typescript-worker-error

# Make changes, then commit
git add -A
git commit -m "fix: update tsconfig to handle vitest dependencies"

# Push to existing branch
git push

# Get PR link
gh pr view --json url -q .url
```

## Tips
1. Always create branches from an up-to-date `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b <new-branch>
   ```

2. Keep commits focused and atomic

3. Use descriptive branch names that match the PR title

4. For complex changes, update the PR description after pushing:
   ```bash
   gh pr edit <pr-number> --body "Updated description..."
   ```

5. View PR status:
   ```bash
   gh pr checks
   gh pr status
   ```