import { Sandbox, SandboxPaginator, SandboxInfo } from "e2b";
import { initServices } from "./init-services";
import { CLAUDE_TOKENS_TBL } from "../db/schema/claude-tokens";
import { CLI_TOKENS_TBL } from "../db/schema/cli-tokens";
import { eq } from "drizzle-orm";
import { decryptClaudeToken } from "./claude-token-crypto";

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

    // Generate temporary CLI access token for this sandbox
    const sandboxToken = await this.generateSandboxToken(userId, sessionId);
    console.log(`Generated sandbox CLI token for session ${sessionId}`);

    const sandbox = await Sandbox.create(this.TEMPLATE_ID, {
      timeoutMs: this.SANDBOX_TIMEOUT * 1000,
      metadata: {
        sessionId,
        projectId,
        userId,
      } as Record<string, string>,
      envs: {
        PROJECT_ID: projectId,
        USPARK_TOKEN: sandboxToken, // Use sandbox-specific CLI token
        CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
      },
    });

    console.log(
      `Created new sandbox ${sandbox.sandboxId} for session ${sessionId}`,
    );

    // Initialize sandbox (pull project files)
    await this.initializeSandbox(sandbox, projectId);

    return sandbox;
  }

  /**
   * Initialize sandbox with project files
   */
  private static async initializeSandbox(
    sandbox: Sandbox,
    projectId: string,
  ): Promise<void> {
    console.log(`Initializing sandbox for project ${projectId}`);

    // Skip initialization in non-production and preview environments
    const vercelEnv = process.env.VERCEL_ENV;
    const isProductionDeployment = vercelEnv === "production";
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!isProductionDeployment || isDevelopment) {
      console.log(
        `Skipping uspark CLI initialization (VERCEL_ENV: ${vercelEnv}, NODE_ENV: ${process.env.NODE_ENV})`,
      );
      return;
    }

    // Pull all project files using uspark CLI
    const result = await sandbox.commands.run(
      `uspark pull --all --project-id ${projectId} --verbose`,
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
   * Execute Claude command in sandbox
   */
  static async executeClaude(
    sandbox: Sandbox,
    prompt: string,
    projectId: string,
    onBlock?: (block: Record<string, unknown>) => Promise<void>,
  ): Promise<ExecutionResult> {
    try {
      console.log(`Executing Claude with prompt length: ${prompt.length}`);

      // Create a temporary file for the prompt to handle special characters
      const promptFile = `/tmp/prompt_${Date.now()}.txt`;
      await sandbox.files.write(promptFile, prompt);

      const blocks: Array<Record<string, unknown>> = [];
      let buffer = "";

      // Use pipe method with real-time streaming
      // Pipeline: prompt → claude (skip permissions) → watch-claude (sync files)
      const command = `cat "${promptFile}" | claude --print --verbose --output-format stream-json --dangerously-skip-permissions | uspark watch-claude --project-id ${projectId}`;

      const result = await sandbox.commands.run(command, {
        onStdout: async (data: string) => {
          // Buffer and process complete JSON lines
          buffer += data;
          const lines = buffer.split("\n");

          // Keep potentially incomplete last line
          buffer = lines[lines.length - 1] || "";

          // Process complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]?.trim();
            if (line) {
              try {
                const block = JSON.parse(line);
                blocks.push(block);

                // Real-time callback
                if (onBlock) {
                  await onBlock(block);
                }

                console.log(`[BLOCK] Type: ${block.type}`);
              } catch {
                console.error("Failed to parse JSON line:", line);
              }
            }
          }
        },
        onStderr: (data: string) => {
          console.error("Claude stderr:", data);
        },
      });

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const block = JSON.parse(buffer);
          blocks.push(block);
          if (onBlock) {
            await onBlock(block);
          }
        } catch {
          // Ignore incomplete final buffer
        }
      }

      // Clean up prompt file
      await sandbox.commands.run(`rm -f "${promptFile}"`);

      // Extract result from blocks
      const resultBlock = blocks.find((b) => b.type === "result");

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        blocks: blocks,
        totalCost: resultBlock?.total_cost_usd as number | undefined,
        usage: resultBlock?.usage as Record<string, unknown> | undefined,
      };
    } catch (error) {
      console.error("Claude execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        blocks: [],
      };
    }
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
