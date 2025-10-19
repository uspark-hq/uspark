import { Sandbox, SandboxPaginator, SandboxInfo } from "e2b";
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

export class E2BExecutor {
  private static readonly SANDBOX_TIMEOUT = 1800; // 30 minutes
  private static readonly TEMPLATE_ID = "w6qe4mwx23icyuytq64y"; // uSpark Claude template

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
    const randomBytes = await import("crypto").then((m) => m.randomBytes(32));
    const token = `usp_live_${randomBytes.toString("base64url")}`;

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
      try {
        // 2. Reconnect to existing sandbox
        const sandbox = await Sandbox.connect(existingSandbox.sandboxId);
        console.log(
          `Reconnected to sandbox ${existingSandbox.sandboxId} for session ${sessionId}`,
        );

        // Extend timeout on reconnection
        await sandbox.setTimeout(this.SANDBOX_TIMEOUT * 1000);

        return {
          sandbox,
          projectId: effectiveProjectId,
          sourceRepoUrl: project?.sourceRepoUrl || null,
        };
      } catch (error) {
        console.log("Failed to reconnect, will create new sandbox:", error);
      }
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
        ...extraEnvs, // Merge any extra environment variables (may override GITHUB_TOKEN)
      },
    });

    console.log(
      `Created new sandbox ${sandbox.sandboxId} for session ${sessionId}`,
    );

    // Initialize sandbox (pull project files and clone git repo if available)
    await this.initializeSandbox(
      sandbox,
      effectiveProjectId,
      project?.sourceRepoUrl || null,
    );

    return {
      sandbox,
      projectId: effectiveProjectId,
      sourceRepoUrl: project?.sourceRepoUrl || null,
    };
  }

  /**
   * Sync project files (git pull + uspark pull)
   * This runs on every turn execution to ensure code is up-to-date
   * @param sandbox - The sandbox to sync
   * @param projectId - The effective project ID (already resolved for dev/prod)
   * @param sourceRepoUrl - GitHub repository in "owner/repo" format (null if no repo)
   */
  private static async syncProjectFiles(
    sandbox: Sandbox,
    projectId: string,
    sourceRepoUrl: string | null,
  ): Promise<void> {
    const timestamp = Date.now();
    console.log(`Syncing project files for ${projectId}...`);

    if (sourceRepoUrl) {
      // Project has a GitHub repository - sync git repo and uspark files
      console.log(`Syncing GitHub repository: ${sourceRepoUrl}`);

      const syncScript = `
# Log header
echo "========================================" | tee -a /tmp/sync_${timestamp}.log
echo "Project Sync - $(date)" | tee -a /tmp/sync_${timestamp}.log
echo "Project ID: ${projectId}" | tee -a /tmp/sync_${timestamp}.log
echo "Repository: ${sourceRepoUrl}" | tee -a /tmp/sync_${timestamp}.log
echo "========================================" | tee -a /tmp/sync_${timestamp}.log

# Git sync
if [ -d ~/workspace/.git ]; then
  echo "[Git] Updating existing repository..." | tee -a /tmp/sync_${timestamp}.log
  cd ~/workspace && git reset --hard origin/main 2>&1 | tee -a /tmp/sync_${timestamp}.log
  git pull origin main 2>&1 | tee -a /tmp/sync_${timestamp}.log
else
  echo "[Git] Cloning repository..." | tee -a /tmp/sync_${timestamp}.log
  git clone https://\${GITHUB_TOKEN}@github.com/${sourceRepoUrl}.git ~/workspace 2>&1 | tee -a /tmp/sync_${timestamp}.log
fi

# Ensure .gitignore contains .uspark
echo "[Git] Checking .gitignore..." | tee -a /tmp/sync_${timestamp}.log
cd ~/workspace || (echo "ERROR: Failed to cd to ~/workspace" | tee -a /tmp/sync_${timestamp}.log && exit 1)
if grep -qxF '.uspark' .gitignore 2>/dev/null; then
  echo ".uspark already in .gitignore" | tee -a /tmp/sync_${timestamp}.log
else
  echo '.uspark' >> .gitignore && echo "Added .uspark to .gitignore" | tee -a /tmp/sync_${timestamp}.log
fi

# Sync uspark files
echo "[uSpark] Syncing project files to .uspark..." | tee -a /tmp/sync_${timestamp}.log
uspark pull --all --project-id "${projectId}" --output-dir ~/workspace/.uspark --verbose 2>&1 | tee -a /tmp/sync_${timestamp}.log

echo "[Done] Sync completed at $(date)" | tee -a /tmp/sync_${timestamp}.log
`;

      const result = await sandbox.commands.run(syncScript, {
        timeoutMs: 0,
      });

      console.log("Sync stdout:", result.stdout);
      if (result.stderr) {
        console.log("Sync stderr:", result.stderr);
      }

      if (result.exitCode !== 0) {
        const errorDetails = {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          projectId,
          sourceRepoUrl,
        };
        console.error("Failed to sync project files:", errorDetails);
        throw new Error(
          `Project sync failed (exit ${result.exitCode}): ${result.stderr || result.stdout || "Unknown error"}`,
        );
      }

      console.log(
        `Project files synced successfully (log: /tmp/sync_${timestamp}.log)`,
      );
    } else {
      // No GitHub repository - just sync uspark files
      console.log("No GitHub repository - syncing uspark files only");

      const syncScript = `
echo "========================================" | tee /tmp/sync_${timestamp}.log
echo "uSpark Files Sync - $(date)" | tee -a /tmp/sync_${timestamp}.log
echo "Project ID: ${projectId}" | tee -a /tmp/sync_${timestamp}.log
echo "========================================" | tee -a /tmp/sync_${timestamp}.log

echo "[Setup] Creating workspace directory..." | tee -a /tmp/sync_${timestamp}.log
mkdir -p ~/workspace 2>&1 | tee -a /tmp/sync_${timestamp}.log || (echo "ERROR: Failed to create workspace" | tee -a /tmp/sync_${timestamp}.log && exit 1)

echo "[Setup] Changing to workspace directory..." | tee -a /tmp/sync_${timestamp}.log
cd ~/workspace || (echo "ERROR: Failed to cd to ~/workspace" | tee -a /tmp/sync_${timestamp}.log && exit 1)

echo "[uSpark] Pulling project files..." | tee -a /tmp/sync_${timestamp}.log
uspark pull --all --project-id "${projectId}" --output-dir ~/workspace/.uspark --verbose 2>&1 | tee -a /tmp/sync_${timestamp}.log

echo "[Done] Sync completed at $(date)" | tee -a /tmp/sync_${timestamp}.log
`;

      const result = await sandbox.commands.run(syncScript, {
        timeoutMs: 0,
      });

      console.log("Sync stdout:", result.stdout);
      if (result.stderr) {
        console.log("Sync stderr:", result.stderr);
      }

      if (result.exitCode !== 0) {
        const errorDetails = {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          projectId,
        };
        console.error("Failed to sync uspark files:", errorDetails);
        throw new Error(
          `uSpark sync failed (exit ${result.exitCode}): ${result.stderr || result.stdout || "Unknown error"}`,
        );
      }

      console.log(
        `uSpark files synced successfully (log: /tmp/sync_${timestamp}.log)`,
      );
    }
  }

  /**
   * Initialize sandbox with project files (only called once on sandbox creation)
   * Just delegates to syncProjectFiles
   * @param projectId - The effective project ID (already resolved for dev/prod)
   * @param sourceRepoUrl - GitHub repository in "owner/repo" format (null if no repo)
   */
  private static async initializeSandbox(
    sandbox: Sandbox,
    projectId: string,
    sourceRepoUrl: string | null,
  ): Promise<void> {
    console.log(`Initializing sandbox for project ${projectId}`);
    // Reuse the sync method for initial setup
    await this.syncProjectFiles(sandbox, projectId, sourceRepoUrl);
    console.log("Sandbox initialized successfully");
  }

  /**
   * Execute Claude command in sandbox (async - does not wait for completion)
   * Syncs project files before execution to ensure code is up-to-date
   */
  static async executeClaude(
    sandbox: Sandbox,
    prompt: string,
    projectId: string,
    turnId: string,
    sessionId: string,
    sourceRepoUrl: string | null,
  ): Promise<ExecutionResult> {
    console.log(`Executing Claude with prompt length: ${prompt.length}`);

    // Sync project files before execution (git pull + uspark pull)
    console.log("Syncing project files before Claude execution...");
    await this.syncProjectFiles(sandbox, projectId, sourceRepoUrl);
    console.log("Project files synced, starting Claude execution...");

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

    // Create a temporary file for the prompt to handle special characters
    const timestamp = Date.now();
    const promptFile = `/tmp/prompt_${timestamp}.txt`;
    await sandbox.files.write(promptFile, prompt);

    // Pipeline: prompt → claude (skip permissions) → watch-claude (sync files + callback API)
    // Execute in ~/workspace directory where project files are located
    // Use --prefix .uspark to only sync files under .uspark directory
    // Log everything to /tmp/claude_exec_<timestamp>.log
    const command = `
echo "========================================" | tee /tmp/claude_exec_${timestamp}.log
echo "Claude Execution - $(date)" | tee -a /tmp/claude_exec_${timestamp}.log
echo "Turn ID: ${effectiveTurnId}" | tee -a /tmp/claude_exec_${timestamp}.log
echo "Session ID: ${effectiveSessionId}" | tee -a /tmp/claude_exec_${timestamp}.log
echo "Project ID: ${effectiveProjectId}" | tee -a /tmp/claude_exec_${timestamp}.log
echo "========================================" | tee -a /tmp/claude_exec_${timestamp}.log

echo "[Exec] Changing to workspace directory..." | tee -a /tmp/claude_exec_${timestamp}.log
cd ~/workspace 2>&1 | tee -a /tmp/claude_exec_${timestamp}.log || (echo "ERROR: Failed to cd to ~/workspace" | tee -a /tmp/claude_exec_${timestamp}.log && exit 1)

echo "[Exec] Starting Claude pipeline..." | tee -a /tmp/claude_exec_${timestamp}.log
cat "${promptFile}" | claude --print --verbose --output-format stream-json --dangerously-skip-permissions | uspark watch-claude --project-id ${effectiveProjectId} --turn-id ${effectiveTurnId} --session-id ${effectiveSessionId} --prefix .uspark 2>&1 | tee -a /tmp/claude_exec_${timestamp}.log

echo "========================================" | tee -a /tmp/claude_exec_${timestamp}.log
echo "Claude Execution Finished - $(date)" | tee -a /tmp/claude_exec_${timestamp}.log
echo "========================================" | tee -a /tmp/claude_exec_${timestamp}.log
`;

    console.log(
      `Starting Claude execution (log: /tmp/claude_exec_${timestamp}.log)`,
    );

    // Run in background - command continues in sandbox even after client disconnects
    await sandbox.commands.run(command, {
      background: true,
      timeoutMs: 0,
    });

    // Clean up prompt file
    await sandbox.commands.run(`rm -f "${promptFile}"`);

    return {
      success: true,
      output: `Background execution started for turn ${effectiveTurnId} (log: /tmp/claude_exec_${timestamp}.log)`,
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
    try {
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
    } catch (error) {
      console.error(`Failed to interrupt session ${sessionId}:`, error);
      // Don't throw - this is best-effort cleanup
    }
  }

  /**
   * Clean up sandbox (optional - usually let it timeout)
   */
  static async closeSandbox(sandboxId: string): Promise<void> {
    try {
      const sandbox = await Sandbox.connect(sandboxId);
      await sandbox.kill();
      console.log(`Closed sandbox ${sandboxId}`);
    } catch (error) {
      console.error(`Failed to close sandbox ${sandboxId}:`, error);
    }
  }
}
