import { Sandbox, SandboxPaginator, SandboxInfo } from "e2b";
import { randomBytes } from "crypto";
import { initServices } from "./init-services";
import { CLI_TOKENS_TBL } from "../db/schema/cli-tokens";
import { PROJECTS_TBL } from "../db/schema/projects";
import { eq, and, lt } from "drizzle-orm";
import { getClaudeToken } from "./get-user-claude-token";
import { getInstallationToken } from "./github/auth";
import { env } from "../env";

/**
 * E2B Executor for Claude Code
 * Manages sandbox lifecycle and Claude execution
 */

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  blocks?: Array<Record<string, unknown>>;
  totalCost?: number;
  usage?: Record<string, unknown>;
}

/**
 * uSpark Agent configuration for Claude Code
 * This is written to ~/.claude/CLAUDE.md in the sandbox at runtime
 */
const USPARK_CLAUDE_CONFIG = `# uSpark Agent

You are **uSpark**, an AI-powered Dev Manager Agent. Your expertise includes:

- Analyzing software project code, build processes, deployment pipelines, and production runtime behavior
- Writing comprehensive technical documentation
- Planning and coordinating code changes

## Working Environment

- **Working Directory**: \`~/workspace\`
- **Documentation Output**: When you need to create documentation, you MUST write markdown files exclusively in the \`~/workspace/.uspark\` directory
- **Task Management**: Use \`~/workspace/.uspark/tasks/\` directory for task planning and tracking
- All documentation must be in markdown format

## Plan Mode Workflow

**Automatically detect when plan mode is needed**: If the user's request involves modifying code OUTSIDE the \`~/workspace/.uspark\` directory, you MUST enter plan mode.

### When to Enter Plan Mode

**Enter plan mode if:**
- User requests changes to application code (any files outside \`.uspark/\`)
- User asks to implement new features
- User asks to fix bugs in the codebase
- User asks to refactor code

**Do NOT enter plan mode if:**
- User only requests analysis or documentation
- Changes are limited to \`~/workspace/.uspark/\` directory only
- User asks questions about the codebase

### Plan Mode Process

When plan mode is triggered:

1. **Analyze the request** - Understand what needs to be changed

2. **Create a detailed plan** - Write a comprehensive plan including:
   - Objective and scope
   - Files that will be modified
   - Step-by-step implementation approach
   - Potential risks or considerations
   - Testing strategy

3. **Present the plan to user** - Clearly present your plan and explicitly ask:
   "Please review this plan. Should I proceed with these changes?"

4. **Wait for user approval** - Do NOT make any code changes until the user confirms approval

5. **Create task file** - After user approves the plan:
   - Create a new task file in \`~/workspace/.uspark/tasks/\`
   - Use naming pattern: \`task-1.md\`, \`task-2.md\`, etc. (use the next available number)
   - Include the full approved plan in the task file
   - Track implementation progress in this file

6. **Execute the plan** - Implement changes according to the approved plan

7. **Update task file** - Document completion status and any deviations from the plan

### Critical Rules

- **NEVER modify code outside \`.uspark/\` without user approval**
- **ALWAYS present a plan first** before making code changes
- **Be explicit** when asking for approval - don't assume silence means consent
- **Create task files** only after approval, not during planning phase

## Guidelines

1. Focus on providing actionable insights about the project's codebase and infrastructure
2. When documenting findings, create well-structured markdown files in \`~/workspace/.uspark\`
3. Maintain professional and technical accuracy in all analysis and documentation
4. Automatically detect when plan mode is needed based on the nature of user requests
`;

export class E2BExecutor {
  private static readonly SANDBOX_TIMEOUT = 1800; // 30 minutes
  private static readonly TEMPLATE_ID = "w6qe4mwx23icyuytq64y"; // uSpark Claude template

  /**
   * Initialize Claude Code configuration in sandbox
   * Writes uSpark agent config to ~/.claude/CLAUDE.md
   */
  private static async initializeClaudeConfig(sandbox: Sandbox): Promise<void> {
    const claudeConfigPath = "/home/user/.claude/CLAUDE.md";

    // Create .claude directory if it doesn't exist
    await sandbox.commands.run("mkdir -p /home/user/.claude", {
      timeoutMs: 5000,
    });

    // Write CLAUDE.md configuration
    await sandbox.files.write(claudeConfigPath, USPARK_CLAUDE_CONFIG);

    console.log(`Initialized Claude Code config at ${claudeConfigPath}`);
  }

  /**
   * Generate a temporary CLI token for E2B sandbox
   */
  private static async generateSandboxToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    initServices();

    // Clean up expired tokens before creating new one
    await this.cleanupExpiredTokens(userId);

    // Generate secure token same as regular CLI tokens
    const randomBytesValue = randomBytes(32);
    const token = `usp_live_${randomBytesValue.toString("base64url")}`;

    // Store token in database with 2 hour expiration (longer than sandbox timeout)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
      token,
      userId,
      name: `E2B Sandbox - ${sessionId.substring(0, 8)}`,
      expiresAt,
      createdAt: now,
    });

    return token;
  }

  /**
   * Clean up expired sandbox tokens for a user
   */
  private static async cleanupExpiredTokens(userId: string): Promise<void> {
    initServices();

    await globalThis.services.db
      .delete(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, userId),
          lt(CLI_TOKENS_TBL.expiresAt, new Date()),
        ),
      );
  }

  /**
   * Get or create a sandbox for a session
   * Returns both the sandbox and project information needed for syncing
   */
  static async getSandboxForSession(
    sessionId: string,
    projectId: string,
    userId: string,
    extraEnvs?: Record<string, string>,
  ): Promise<{
    sandbox: Sandbox;
    projectId: string;
    sourceRepoUrl: string | null;
  }> {
    initServices();

    // Get project information first (needed for both new and reconnected sandboxes)
    // Check if we're in development mode by checking if dev token is configured
    const isDevelopment = !!env().USPARK_TOKEN_FOR_DEV;
    const effectiveProjectId = isDevelopment
      ? env().PROJECT_ID_FOR_DEV!
      : projectId;

    const projects = await globalThis.services.db
      .select({
        sourceRepoUrl: PROJECTS_TBL.sourceRepoUrl,
        sourceRepoInstallationId: PROJECTS_TBL.sourceRepoInstallationId,
      })
      .from(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, effectiveProjectId))
      .limit(1);

    const project = projects[0];

    // 1. Try to find existing sandbox
    const paginator: SandboxPaginator = await Sandbox.list();
    const sandboxes: SandboxInfo[] = await paginator.nextItems(); // Get first page of sandboxes
    const existingSandbox = sandboxes.find(
      (s: SandboxInfo) => s.metadata?.sessionId === sessionId,
    );

    if (existingSandbox) {
      // 2. Reconnect to existing sandbox
      const sandbox = await Sandbox.connect(existingSandbox.sandboxId);
      console.log(
        `Reconnected to sandbox ${existingSandbox.sandboxId} for session ${sessionId}`,
      );

      // Extend timeout on reconnection
      await sandbox.setTimeout(this.SANDBOX_TIMEOUT * 1000);

      // Initialize Claude Code configuration
      await this.initializeClaudeConfig(sandbox);

      return {
        sandbox,
        projectId: effectiveProjectId,
        sourceRepoUrl: project?.sourceRepoUrl || null,
      };
    }

    // 3. Create new sandbox
    console.log(`Creating new sandbox for session ${sessionId}`);

    // Get Claude token from environment
    const claudeToken = getClaudeToken();

    // Get sandbox token based on environment
    const sandboxToken = isDevelopment
      ? env().USPARK_TOKEN_FOR_DEV!
      : await this.generateSandboxToken(userId, sessionId);

    if (isDevelopment) {
      console.log("Using development USPARK_TOKEN and PROJECT_ID for sandbox");
    } else {
      console.log(`Generated sandbox CLI token for session ${sessionId}`);
    }

    let githubToken: string | null = null;

    // Get GitHub installation token if project has a repository
    if (
      project?.sourceRepoUrl &&
      project.sourceRepoInstallationId &&
      !extraEnvs?.GITHUB_TOKEN // Don't override if already provided (e.g., initial scan)
    ) {
      githubToken = await getInstallationToken(
        project.sourceRepoInstallationId,
      );
      console.log(
        `Retrieved GitHub token for installation ${project.sourceRepoInstallationId}`,
      );
    }

    const sandbox = await Sandbox.create(this.TEMPLATE_ID, {
      timeoutMs: this.SANDBOX_TIMEOUT * 1000,
      metadata: {
        sessionId,
        projectId: effectiveProjectId,
        userId,
      } as Record<string, string>,
      envs: {
        PROJECT_ID: effectiveProjectId,
        USPARK_TOKEN: sandboxToken,
        CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
        ...(githubToken ? { GITHUB_TOKEN: githubToken } : {}),
        ...(project?.sourceRepoUrl ? { REPO_URL: project.sourceRepoUrl } : {}),
        ...extraEnvs, // Merge any extra environment variables (may override GITHUB_TOKEN)
      },
    });

    console.log(
      `Created new sandbox ${sandbox.sandboxId} for session ${sessionId}`,
    );

    // Initialize Claude Code configuration
    await this.initializeClaudeConfig(sandbox);

    // Note: Workspace initialization (git clone/pull) happens in execute-claude-turn.sh
    // This ensures the workspace is always up-to-date before each turn execution

    return {
      sandbox,
      projectId: effectiveProjectId,
      sourceRepoUrl: project?.sourceRepoUrl || null,
    };
  }

  /**
   * Execute Claude command in sandbox (async - does not wait for completion)
   * Uses the unified execute-claude-turn.sh script which handles:
   * 1. File synchronization (git pull + uspark pull)
   * 2. Claude execution pipeline
   * 3. Cleanup
   */
  static async executeClaude(
    sandbox: Sandbox,
    prompt: string,
    projectId: string,
    turnId: string,
    sessionId: string,
  ): Promise<ExecutionResult> {
    console.log(`Executing Claude with prompt length: ${prompt.length}`);

    // Check if we're in development mode by checking if dev token is configured
    const isDevelopment = !!env().USPARK_TOKEN_FOR_DEV;

    // Use dev IDs in development
    let effectiveProjectId: string;
    let effectiveTurnId: string;
    let effectiveSessionId: string;

    if (isDevelopment) {
      const devProjectId = env().PROJECT_ID_FOR_DEV;
      const devTurnId = env().TURN_ID_FOR_DEV;
      const devSessionId = env().SESSION_ID_FOR_DEV;

      if (!devProjectId) {
        throw new Error(
          "PROJECT_ID_FOR_DEV environment variable is required in development mode",
        );
      }
      if (!devTurnId) {
        throw new Error(
          "TURN_ID_FOR_DEV environment variable is required in development mode",
        );
      }
      if (!devSessionId) {
        throw new Error(
          "SESSION_ID_FOR_DEV environment variable is required in development mode",
        );
      }

      effectiveProjectId = devProjectId;
      effectiveTurnId = devTurnId;
      effectiveSessionId = devSessionId;
    } else {
      effectiveProjectId = projectId;
      effectiveTurnId = turnId;
      effectiveSessionId = sessionId;
    }

    console.log(
      `Using IDs - Project: ${effectiveProjectId}, Turn: ${effectiveTurnId}, Session: ${effectiveSessionId}`,
    );

    // Write prompt to file with fixed naming pattern: /tmp/prompt_${TURN_ID}.txt
    const promptFile = `/tmp/prompt_${effectiveTurnId}.txt`;
    await sandbox.files.write(promptFile, prompt);

    // Generate log file with current datetime
    const now = new Date();
    const datetime = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "");
    const logFile = `/tmp/execute_${datetime}.log`;

    console.log(
      `Starting Claude turn execution via script (prompt: ${promptFile}, log: ${logFile})`,
    );

    // Execute the complete turn via the unified script, followed by file sync
    // The script will handle workspace setup and Claude execution
    // After Claude finishes, push all files from .uspark directory
    // Environment variables set inline (TURN_ID and SESSION_ID)
    // Other vars (PROJECT_ID, USPARK_TOKEN, etc) are set at sandbox creation
    // All output (stdout and stderr) redirected to log file
    const command = `TURN_ID="${effectiveTurnId}" SESSION_ID="${effectiveSessionId}" /usr/local/bin/execute-claude-turn.sh >> ${logFile} 2>&1`;

    // Run in background - command continues in sandbox even after client disconnects
    await sandbox.commands.run(command, {
      background: true,
      timeoutMs: 0,
    });

    return {
      success: true,
      output: `Background execution started for turn ${effectiveTurnId} (log: ${logFile})`,
    };
  }

  /**
   * Parse Claude's JSON output stream into blocks
   */
  static parseClaudeOutput(output: string): Array<Record<string, unknown>> {
    const blocks: Array<Record<string, unknown>> = [];
    const lines = output.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        blocks.push(parsed);
      } catch {
        // Skip non-JSON lines (might be uspark CLI output)
        console.log("Non-JSON output:", line);
      }
    }

    return blocks;
  }

  /**
   * Interrupt a running session by killing Claude processes in the sandbox
   */
  static async interruptSession(sessionId: string): Promise<void> {
    // Find sandbox for this session
    const paginator: SandboxPaginator = await Sandbox.list();
    const sandboxes: SandboxInfo[] = await paginator.nextItems();
    const sandboxInfo = sandboxes.find(
      (s: SandboxInfo) => s.metadata?.sessionId === sessionId,
    );

    if (!sandboxInfo) {
      console.log(
        `No sandbox found for session ${sessionId}, nothing to interrupt`,
      );
      return;
    }

    // Connect to sandbox and kill Claude processes
    const sandbox = await Sandbox.connect(sandboxInfo.sandboxId);

    // Kill both claude and watch-claude processes
    // Use || true to prevent command from failing if processes are not found
    const killCommand = `pkill -f 'claude.*--print' || true; pkill -f 'uspark watch-claude' || true`;

    const result = await sandbox.commands.run(killCommand, {
      timeoutMs: 5000,
    });

    console.log(
      `Interrupted session ${sessionId} in sandbox ${sandboxInfo.sandboxId}`,
    );
    console.log("Kill command result:", result.stdout, result.stderr);
  }

  /**
   * Clean up sandbox (optional - usually let it timeout)
   */
  static async closeSandbox(sandboxId: string): Promise<void> {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();
    console.log(`Closed sandbox ${sandboxId}`);
  }
}
