# Preview Deployment Setup

This repository is configured to automatically create preview deployments for pull requests using Vercel and Neon database branches.

⚠️ **Important**: The preview deployment workflow will fail until the required secrets are configured. This is expected behavior.

## How It Works

1. **Automatic Deployments Disabled**: Vercel's automatic Git deployments are disabled via `vercel.json`
2. **PR Opens**: When a PR is opened, the CI workflow:
   - Creates a new Neon database branch named `preview-pr-{PR_NUMBER}`
   - Runs database migrations on the branch
   - Deploys to Vercel with the branch database URL
   - Comments on the PR with deployment links
3. **PR Updates**: On new commits, the deployment is updated
4. **PR Closes**: When merged or closed, the Neon branch is automatically deleted

## Required GitHub Secrets and Variables

Configure these in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Secrets (Store as Secrets)
- `VERCEL_TOKEN`: Your Vercel personal access token
  - Generate at: https://vercel.com/account/tokens
- `NEON_API_KEY`: Your Neon API key (Optional but Recommended)
  - Generate at: https://console.neon.tech/app/settings/api-keys

### Variables (Store as Repository Variables)
- `VERCEL_TEAM_ID`: Your Vercel team/organization ID
  - Find in Vercel project settings → General → Team ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
  - Find in Vercel project settings → General → Project ID
- `NEON_PROJECT_ID`: Your Neon project ID (Optional but Recommended)
  - Find in Neon console → Project Settings → General

**Note**: If Neon secrets are not configured, the deployment will still work but without database branching.

## Initial Setup

1. **Configure Vercel Project Settings**:
   - Go to your Vercel project settings: https://vercel.com/[your-team]/makita/settings
   - Under "General" → "Root Directory", set it to: `turbo/apps/web`
   - Save the changes

2. Set up your production database in Neon

3. Add all required secrets and variables to GitHub (see above)

4. The workflow will automatically handle preview deployments for PRs

**Important**: The Vercel project must be configured with the correct root directory (`turbo/apps/web`) for the monorepo structure to work properly.

## Database Schema Push

The workflow automatically pushes database schema to preview branches using:
```bash
pnpm db:push
```

This uses Drizzle Kit to push your schema defined in `turbo/apps/web/src/db/schema/` to the Neon database branch.