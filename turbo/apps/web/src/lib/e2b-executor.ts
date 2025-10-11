import { Sandbox, SandboxPaginator, SandboxInfo } from "e2b";
import { initServices } from "./init-services";
import { CLAUDE_TOKENS_TBL } from "../db/schema/claude-tokens";
import { CLI_TOKENS_TBL } from "../db/schema/cli-tokens";
import { eq, and, lt } from "drizzle-orm";
import { decryptClaudeToken } from "./claude-token-crypto";
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
   */
  static async getSandboxForSession(
    sessionId: string,
    projectId: string,
    userId: string,
  ): Promise<Sandbox> {
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

        return sandbox;
      } catch (error) {
        console.log("Failed to reconnect, will create new sandbox:", error);
      }
    }

    // 3. Create new sandbox
    console.log(`Creating new sandbox for session ${sessionId}`);

    // Get user's Claude token
    const claudeToken = await this.getUserClaudeToken(userId);
    if (!claudeToken) {
      throw new Error("User has not configured Claude OAuth token");
    }

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === "development";

    // Get sandbox token and effective project ID based on environment
    let sandboxToken: string;
    let effectiveProjectId: string;

    if (isDevelopment) {
      const devToken = env().USPARK_TOKEN_FOR_DEV;
      const devProjectId = env().PROJECT_ID_FOR_DEV;

      if (!devToken) {
        throw new Error(
          "USPARK_TOKEN_FOR_DEV environment variable is required in development mode",
        );
      }
      if (!devProjectId) {
        throw new Error(
          "PROJECT_ID_FOR_DEV environment variable is required in development mode",
        );
      }

      sandboxToken = devToken;
      effectiveProjectId = devProjectId;
      console.log("Using development USPARK_TOKEN and PROJECT_ID for sandbox");
    } else {
      sandboxToken = await this.generateSandboxToken(userId, sessionId);
      effectiveProjectId = projectId;
      console.log(`Generated sandbox CLI token for session ${sessionId}`);
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
      },
    });

    console.log(
      `Created new sandbox ${sandbox.sandboxId} for session ${sessionId}`,
    );

    // Initialize sandbox (pull project files)
    await this.initializeSandbox(sandbox, effectiveProjectId);

    return sandbox;
  }

  /**
   * Initialize sandbox with project files
   * @param projectId - The effective project ID (already resolved for dev/prod)
   */
  private static async initializeSandbox(
    sandbox: Sandbox,
    projectId: string,
  ): Promise<void> {
    console.log(`Initializing sandbox for project ${projectId}`);

    // Pull all project files using uspark CLI in /workspace directory
    const result = await sandbox.commands.run(
      `cd /workspace && uspark pull --all --project-id "${projectId}" --verbose 2>&1 | tee /tmp/pull.log`,
    );

    // Always log the output for debugging
    console.log("Pull command stdout:", result.stdout);
    if (result.stderr) {
      console.log("Pull command stderr:", result.stderr);
    }

    if (result.exitCode !== 0) {
      const errorDetails = {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        projectId,
      };
      console.error("Failed to initialize sandbox:", errorDetails);
      throw new Error(
        `Sandbox initialization failed (exit ${result.exitCode}): ${result.stderr || result.stdout || "Unknown error"}`,
      );
    }

    console.log("Sandbox initialized successfully with project files");
  }

  /**
   * Execute Claude command in sandbox (async - does not wait for completion)
   */
  static async executeClaude(
    sandbox: Sandbox,
    prompt: string,
    projectId: string,
    turnId: string,
    sessionId: string,
  ): Promise<ExecutionResult> {
    console.log(`Executing Claude with prompt length: ${prompt.length}`);

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === "development";

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
    const promptFile = `/tmp/prompt_${Date.now()}.txt`;
    await sandbox.files.write(promptFile, prompt);

    // Pipeline: prompt → claude (skip permissions) → watch-claude (sync files + callback API)
    // Execute in /workspace directory where project files are located
    const command = `cd /workspace && cat "${promptFile}" | claude --print --verbose --output-format stream-json --dangerously-skip-permissions | uspark watch-claude --project-id ${effectiveProjectId} --turn-id ${effectiveTurnId} --session-id ${effectiveSessionId} 2>&1 | tee /tmp/claude_exec.log`;

    // Run in background - command continues in sandbox even after client disconnects
    await sandbox.commands.run(command, {
      background: true,
      onStdout: (data: string) => {
        console.log(
          `[Turn ${effectiveTurnId}] stdout:`,
          data.substring(0, 100),
        );
      },
      onStderr: (data: string) => {
        console.error(`[Turn ${effectiveTurnId}] stderr:`, data);
      },
    });

    // Clean up prompt file
    await sandbox.commands.run(`rm -f "${promptFile}"`);

    return {
      success: true,
      output: `Background execution started for turn ${effectiveTurnId}`,
    };
  }

  /**
   * Get user's Claude OAuth token from database
   */
  private static async getUserClaudeToken(
    userId: string,
  ): Promise<string | null> {
    initServices();

    const [tokenRecord] = await globalThis.services.db
      .select()
      .from(CLAUDE_TOKENS_TBL)
      .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
      .limit(1);

    if (!tokenRecord || !tokenRecord.encryptedToken) {
      return null;
    }

    // Decrypt and return token
    return decryptClaudeToken(tokenRecord.encryptedToken);
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
