#!/bin/bash
set -e

echo "🧹 Cleaning up GitHub deployments..."

# Use GitHub CLI with JavaScript for more reliable processing
gh api graphql -f query='
  query {
    viewer {
      login
    }
  }
' > /dev/null

echo "Running cleanup script..."

node -e "
const { execSync } = require('child_process');

async function run() {
  let deletedCount = 0;
  let skippedCount = 0;

  console.log('📊 Fetching all deployments...');

  // Get all deployments with pagination
  let deployments = [];
  let page = 1;
  while (true) {
    const deploymentsJson = execSync(\`gh api '/repos/:owner/:repo/deployments?per_page=100&page=\${page}'\`, { encoding: 'utf-8' });
    const pageDeployments = JSON.parse(deploymentsJson);
    if (pageDeployments.length === 0) break;
    deployments = deployments.concat(pageDeployments);
    console.log(\`  Fetched page \${page}: \${pageDeployments.length} deployments\`);
    page++;
    if (page > 10) break; // Safety limit
  }

  console.log(\`Found \${deployments.length} total deployments\n\`);

  // Get open PRs
  console.log('📋 Fetching open PRs...');
  const openPrsJson = execSync('gh pr list --state open --json headRefName', { encoding: 'utf-8' });
  const openPrs = JSON.parse(openPrsJson).map(pr => pr.headRefName);
  console.log(\`Found \${openPrs.length} open PRs\n\`);

  // Function to delete deployment
  async function deleteDeployment(id, env) {
    console.log(\`  🗑️  Deleting deployment \${id} (\${env})...\`);

    try {
      // Step 1: Mark as inactive
      execSync(\`gh api -X POST /repos/:owner/:repo/deployments/\${id}/statuses -f state=inactive -f description='Manual cleanup'\`, {
        stdio: 'ignore'
      });

      // Step 2: Delete
      execSync(\`gh api -X DELETE /repos/:owner/:repo/deployments/\${id}\`, {
        stdio: 'ignore'
      });

      console.log(\`  ✅ Deleted deployment \${id}\`);
      deletedCount++;
    } catch (error) {
      console.log(\`  ⚠️  Failed to delete deployment \${id}\`);
    }
  }

  // Clean up closed PR deployments
  console.log('🔍 Cleaning up closed PR deployments...\n');

  for (const deployment of deployments) {
    const { id, environment, ref } = deployment;

    // Skip production environments for now
    if (['production', 'web/production', 'workspace/production'].includes(environment)) {
      continue;
    }

    // Check if this is a preview deployment
    if (environment.includes('/preview/')) {
      // Extract branch name from environment
      const branchName = environment.split('/preview/')[1];

      // Check if PR is still open
      if (openPrs.includes(branchName)) {
        console.log(\`  ⏭️  Skipping active PR: \${branchName}\`);
        skippedCount++;
      } else {
        console.log(\`  📦 Found closed PR deployment: \${branchName}\`);
        await deleteDeployment(id, environment);
      }
    }
  }

  // Clean up old production deployments
  console.log('\n🏭 Cleaning up old production deployments (keeping 3 most recent per environment)...\n');

  const prodEnvs = ['production', 'web/production', 'workspace/production'];

  for (const prodEnv of prodEnvs) {
    console.log(\`  Processing \${prodEnv}...\`);

    // Filter and sort deployments for this environment
    const prodDeployments = deployments
      .filter(d => d.environment === prodEnv)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(\`  📊 Found \${prodDeployments.length} deployments\`);

    if (prodDeployments.length <= 3) {
      console.log(\`  ✅ Only \${prodDeployments.length} deployments, keeping all\n\`);
      continue;
    }

    // Keep first 3, delete the rest
    for (let i = 0; i < prodDeployments.length; i++) {
      const deployment = prodDeployments[i];

      if (i < 3) {
        console.log(\`  ✅ Keeping recent deployment \${deployment.id} (created: \${deployment.created_at})\`);
      } else {
        console.log(\`  📦 Found old deployment from \${deployment.created_at}\`);
        await deleteDeployment(deployment.id, prodEnv);
      }
    }
    console.log('');
  }

  console.log('✨ Cleanup complete!');
  console.log(\`  🗑️  Deleted: \${deletedCount} deployments\`);
  console.log(\`  ⏭️  Skipped: \${skippedCount} deployments\`);
}

run().catch(console.error);
"
