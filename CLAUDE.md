# Claude Code Project Guidelines

## Global Services Pattern

### How to Use Services

We use a simple global services pattern for managing singletons like database connections:

```typescript
// In any API route or server component
import { initServices } from "../lib/init-services";

export async function GET() {
  // Initialize services at entry point (idempotent - safe to call multiple times)
  initServices();
  
  // Access services directly from globalThis
  const users = await globalThis.services.db.select().from(users);
  const env = globalThis.services.env;
  
  return NextResponse.json({ users });
}
```

### Key Points

- **Always call `initServices()` at the entry point** - This ensures services are initialized
- **Services are lazy-loaded** - Database connections are only created when first accessed
- **No cleanup needed** - Serverless functions handle cleanup automatically
- **Type-safe** - Full TypeScript support via global type declarations

### Available Services

- `globalThis.services.env` - Validated environment variables
- `globalThis.services.db` - Drizzle database instance
- `globalThis.services.pool` - PostgreSQL connection pool

## Local Development

### Running the Web Application

**Use Vercel CLI for local development of the web application:**

```bash
# In the turbo directory
vercel dev
```

**Why use `vercel dev` instead of `pnpm dev`:**
- Automatically loads environment variables from Vercel project settings
- Provides required Blob storage token (`BLOB_READ_WRITE_TOKEN`)
- Simulates production environment more accurately
- No manual environment configuration needed

**Note:** The web application requires Vercel Blob storage token to function properly. This is automatically provided when using `vercel dev`.

## Pre-Commit Checks

**All code must pass these checks before committing.** Run these commands from the `/turbo` directory to ensure code quality:

### Required Checks:
- **Lint:** `cd turbo && pnpm turbo run lint` - Check for code style and quality issues
- **Type Check:** `cd turbo && pnpm check-types` - Verify TypeScript type safety
- **Format:** `cd turbo && pnpm format` - Auto-format code according to project standards
- **Test:** `cd turbo && pnpm vitest` - Run all tests to ensure functionality
- **Knip:** `cd turbo && pnpm knip` - Find and fix unused dependencies, exports, and files

### Before Committing:
1. Run all checks to ensure code quality
2. Fix any issues that are found
3. Never commit code that fails any of these checks
4. Use proper conventional commit message format
5. These checks help maintain the high standards defined in our design principles

## Code Quality Tools

### Knip - Dependency and Export Analysis

**Knip is integrated to maintain a clean and efficient codebase.** It identifies unused files, dependencies, and exports across the monorepo.

#### Available Commands:
- `pnpm knip` - Run full analysis to find unused code
- `pnpm knip:fix` - Automatically fix issues (removes unused files and dependencies)
- `pnpm knip:production` - Strict production mode analysis
- `pnpm knip --workspace <name>` - Analyze specific workspace only

#### Configuration:
- Configuration file: `turbo/knip.json`
- Workspace-specific settings for each package
- Integrated with GitHub Actions CI pipeline

#### Common Issues and Solutions:
- **Unused dependencies:** Review and remove from package.json
- **Unused exports:** Delete or mark as internal if needed
- **Unused files:** Remove if truly unused, or add to entry patterns if needed
- **False positives:** Add to ignore patterns in knip.json

## E2E Testing Guidelines (e2e/web)

**Follow these guidelines when writing end-to-end tests:**

### Key Principles:
1. **No console.log debugging** - Test execution should be silent. Remove all debugging logs
2. **Use default timeouts** - Tests should complete within default timeout limits. Never set custom timeouts
3. **Simple authentication** - Use `clerkSetup()` directly for login. No need to manually handle environment variables
4. **Comprehensive testing** - Write larger tests that cover multiple workflows rather than many small isolated tests
5. **Wait for UI elements** - Don't rely on network events. Wait for actual UI elements to appear, which is more natural

### Examples:

**✅ Good - Clean test with proper authentication:**
```typescript
test("complete user workflow", async ({ page }) => {
  await clerkSetup();
  
  // Test multiple features in one comprehensive test
  await page.goto("/dashboard");
  await expect(page.locator("h1")).toContainText("Dashboard");
  
  // Wait for UI elements, not network
  await page.click("button[data-testid='create-project']");
  await expect(page.locator(".project-form")).toBeVisible();
});
```

**❌ Bad - Test with debugging and custom timeouts:**
```typescript
test("create project", async ({ page }) => {
  console.log("Starting test..."); // Don't use console.log
  
  // Don't manually handle auth tokens
  const token = process.env.CLERK_TEST_TOKEN;
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });
  
  await page.goto("/dashboard", { timeout: 60000 }); // Don't set custom timeouts
  
  // Don't rely on network events
  await page.waitForResponse(resp => resp.url().includes("/api/projects"));
});
```

## Git Authentication with GitHub CLI

**When SSH keys are not available, use GitHub CLI for authentication:**

```bash
# Switch remote from SSH to HTTPS
git remote set-url origin https://github.com/uspark-hq/uspark.git

# Configure git to use GitHub CLI for authentication
gh auth setup-git

# Test the configuration
git pull
```

This allows pushing/pulling without SSH keys by leveraging the GitHub CLI's authentication.

## CI Checks Before Git Push

**IMPORTANT for Claude Code**: Before executing any `git push` command, you MUST run CI checks:

```bash
./scripts/ci-check.sh
```

Only proceed with push if ALL checks pass. If any check fails:
1. Stop immediately
2. Fix the reported issues  
3. Re-run the checks
4. Only push after all checks pass

**Note**: This is a manual check for Claude Code only. Regular git users won't have automatic pre-push hooks.

### Using Sub-Agent for CI Checks (Recommended)

To keep CI output isolated from the main context, use a sub-agent:

```javascript
await Task({
  description: "Run CI checks",
  prompt: "Execute ./scripts/ci-check.sh and report any failures. Stop at first error.",
  subagent_type: "general-purpose"
});
```

This prevents broken code from reaching the repository while keeping the main context clean.
