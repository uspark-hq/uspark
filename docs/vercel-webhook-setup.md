# Vercel Webhook Setup for E2E Testing

This guide explains how to configure Vercel webhooks to trigger E2E tests after preview deployments.

## Overview

When Vercel completes a preview deployment, it can send a webhook to trigger our E2E test workflow via GitHub's `repository_dispatch` event.

## Setup Steps

### 1. Create a GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token with these permissions:
   - `repo` (full control of private repositories)
   - `workflow` (update GitHub Actions workflows)
3. Copy the token (you'll need it for step 3)

### 2. Add the PAT to Vercel Environment Variables

1. Go to your Vercel project settings
2. Navigate to Settings → Environment Variables
3. Add a new variable:
   - Name: `GITHUB_TOKEN`
   - Value: Your GitHub PAT from step 1
   - Environment: All environments

### 3. Configure Vercel Webhook

1. In your Vercel project, go to Settings → Integrations → Webhooks
2. Click "Create Webhook"
3. Configure as follows:

   **Endpoint URL:**
   ```
   https://api.github.com/repos/{owner}/{repo}/dispatches
   ```
   Replace `{owner}` with your GitHub username/org and `{repo}` with your repository name.

   **Events to listen for:**
   - ✅ `deployment.succeeded`

   **Headers:**
   ```
   Authorization: token YOUR_GITHUB_PAT
   Accept: application/vnd.github.v3+json
   Content-Type: application/json
   ```

   **Request Body Template:**
   ```json
   {
     "event_type": "vercel.deployment.success",
     "client_payload": {
       "url": "{{ deployment.url }}",
       "git": {
         "sha": "{{ deployment.meta.githubCommitSha }}",
         "ref": "{{ deployment.meta.githubCommitRef }}",
         "branch": "{{ deployment.meta.githubBranch }}"
       },
       "deployment": {
         "id": "{{ deployment.id }}",
         "meta": {{ deployment.meta | json }}
       }
     }
   }
   ```

4. Click "Create Webhook"

### 4. Verify Webhook Configuration

1. Create a new PR to trigger a preview deployment
2. Check Vercel webhook logs in Settings → Integrations → Webhooks
3. Verify the webhook was sent successfully
4. Check GitHub Actions to see if the E2E workflow was triggered

## Alternative: Using Vercel's GitHub Integration

If the webhook approach doesn't work, Vercel's GitHub integration might already be sending `repository_dispatch` events. Check if the workflow is triggered automatically without manual webhook configuration.

## Troubleshooting

### Webhook not triggering

- Verify the GitHub PAT has correct permissions
- Check Vercel webhook logs for errors
- Ensure the repository accepts `repository_dispatch` events

### E2E tests can't find PR

- The workflow uses commit SHA to find associated PRs
- Ensure the commit is actually part of a PR
- Check workflow logs for the SHA being searched

### Tests fail against preview URL

- Verify the preview deployment is fully ready
- Check if the preview URL requires authentication
- Ensure environment variables are set correctly in Vercel

## Environment Variables for E2E Tests

The E2E workflow sets these environment variables:

- `PREVIEW_URL`: The Vercel preview deployment URL
- `BASE_URL`: Same as PREVIEW_URL (for compatibility)
- `API_URL`: The API endpoint URL (usually same as BASE_URL)

## Running Tests Locally Against Preview

You can also run E2E tests locally against a Vercel preview:

```bash
# Set the preview URL
export BASE_URL=https://your-preview-url.vercel.app

# Run tests
cd e2e
make test
```

## Security Considerations

- Keep your GitHub PAT secure and rotate it regularly
- Use webhook secrets if available (Vercel may add this feature)
- Limit PAT permissions to minimum required
- Consider using GitHub Apps instead of PATs for production

## Related Files

- `.github/workflows/e2e-after-vercel.yml` - E2E test workflow
- `e2e/helpers/setup.bash` - Test setup with remote URL support
- `e2e/tests/02-api/` - API tests that work with remote deployments