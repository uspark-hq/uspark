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

## Architecture Design Principles

### YAGNI (You Aren't Gonna Need It)
**This is a core principle for this project.** We follow the YAGNI principle strictly to keep the codebase simple and maintainable.

#### What this means:
- **Don't add functionality until it's actually needed**
- **Start with the simplest solution that works**
- **Avoid premature abstractions**
- **Delete unused code aggressively**

#### Examples in this project:
- Test helpers should only include functions that are actively used
- Configuration files should start minimal and grow as needed
- Avoid creating "utility" functions for single use cases
- Don't add "just in case" parameters or options

### Avoid Defensive Programming
**Let exceptions propagate naturally.** Don't wrap everything in try/catch blocks.

#### What this means:
- **Only catch exceptions when you can meaningfully handle them**
- **Let errors bubble up to where they can be properly addressed**
- **Avoid defensive try/catch blocks that just log and re-throw**
- **Trust the runtime and framework error handling**

#### Examples in this project:
- Database operations should fail fast if connection is broken
- File operations should naturally throw if permissions are wrong
- Don't wrap every async operation in try/catch
- Only use try/catch when you have specific error recovery logic

#### Good vs Bad Examples:

**❌ Bad - Defensive programming (catches everything unnecessarily):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const result = await db.select().from(table);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

**✅ Good - Let errors propagate naturally:**
```typescript
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  const body = await request.json();
  const result = await db.select().from(table);
  return NextResponse.json(result);
}
```

**✅ Good - Only catch when you need specific error handling:**
```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch("/api/endpoint");
    if (!response.ok) throw new Error("Request failed");
    setSuccess(true);
  } catch (err) {
    // Meaningful handling: show user-friendly error in UI
    setError(err instanceof Error ? err.message : "An error occurred");
  }
};
```

### Strict Type Checking
**Maintain type safety throughout the codebase.** Never compromise on type checking.

#### What this means:
- **Absolutely no use of `any` type**
- **Always provide explicit types where TypeScript can't infer**
- **Use proper type narrowing instead of type assertions**
- **Define interfaces and types for all data structures**

#### Examples in this project:
- All function parameters must have explicit types
- API responses should have defined interfaces
- Avoid `as` casting unless absolutely necessary
- Use `unknown` instead of `any` when type is truly unknown

### Zero Tolerance for Lint Violations
**All code must pass linting without exceptions.** Maintain code quality standards consistently.

#### What this means:
- **Never add eslint-disable comments**
- **Never add @ts-ignore or @ts-nocheck**
- **Fix the underlying issue, don't suppress the warning**
- **All lint rules are there for a reason - respect them**

#### Examples in this project:
- If a lint rule is triggered, refactor the code to comply
- Don't disable rules in configuration files
- Address TypeScript errors properly, don't ignore them
- Unused variables should be removed, not ignored

## Commit Message Guidelines

**All commit messages must follow Conventional Commits format.** This ensures consistent commit history and enables automated versioning.

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Required Rules:
- **Type must be lowercase** - Use `feat:`, not `Feat:` or `FEAT:`
- **Description must start with lowercase** - Use `add new feature`, not `Add new feature`  
- **No period at the end** - Use `fix user login`, not `fix user login.`
- **Keep title under 100 characters** - Ensure the entire first line is concise
- **Use imperative mood** - Use `add`, not `added` or `adds`

### Types:
- `feat:` New feature (triggers minor version bump)
- `fix:` Bug fix (triggers patch version bump)
- `docs:` Documentation changes (no release)
- `style:` Code style changes (formatting, semicolons, etc) (no release)
- `refactor:` Code refactoring (no release)
- `test:` Test additions or changes (no release)
- `chore:` Build process or auxiliary tool changes (no release)
- `ci:` CI configuration changes (no release)
- `perf:` Performance improvements (no release)
- `build:` Build system changes (no release)
- `revert:` Revert previous commit (no release)

### Release Triggering:
**Only certain commit types trigger automated releases via release-please:**
- ✅ `feat:` - Triggers a **minor** version bump (e.g., 1.2.0 → 1.3.0)
- ✅ `fix:` - Triggers a **patch** version bump (e.g., 1.2.0 → 1.2.1)
- ✅ `deps:` - Dependency updates trigger a **patch** version bump
- ✅ Breaking changes (any type with `!` or `BREAKING CHANGE:` footer) - Triggers a **major** version bump (e.g., 1.2.0 → 2.0.0)
- ❌ All other types (`refactor`, `docs`, `chore`, `ci`, etc.) - Will appear in changelog but **will not trigger a release**

**Important:** If you want a `refactor` or other non-release type to trigger a version bump, use `fix:` instead. For example:
- Use `fix: refactor authentication logic` instead of `refactor: authentication logic`
- This is acceptable since refactoring often fixes technical debt or improves code quality

### Examples:
- ✅ `feat: add user authentication system`
- ✅ `fix: resolve database connection timeout`
- ✅ `docs(api): update endpoint documentation`
- ✅ `ci: optimize release workflow dependencies`
- ❌ `Fix: Resolve database connection timeout.` (wrong case, has period)
- ❌ `added user auth` (missing type, wrong tense)
- ❌ `feat: Add user authentication system with OAuth2 integration, JWT tokens, refresh mechanism, and comprehensive error handling` (too long)

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
