import { createInterface } from "readline";
import chalk from "chalk";
import { requireAuth } from "./shared";

export async function watchClaudeCommand(options: {
  projectId: string;
  turnId: string;
  sessionId: string;
  prefix?: string;
}): Promise<void> {
  const context = await requireAuth();

  // Track pending stdout callback promises to wait for them before exiting
  const pendingCallbacks: Array<Promise<void>> = [];

  // Create readline interface to process stdin line by line
  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    // Always pass through the output transparently
    console.log(line);

    // Parse JSON line - all input should be valid JSON from Claude CLI
    try {
      JSON.parse(line);
    } catch {
      // Skip non-JSON lines silently (e.g., debug output, warnings)
      // Don't send to callback API if not valid JSON
      return;
    }

    // Send stdout line to callback API (non-blocking)
    const callbackPromise = sendStdoutCallback(context, options, line).catch(
      (error) => {
        // Only log errors to stderr, don't affect main flow
        console.error(
          chalk.red(
            `[uspark] Failed to send stdout callback: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      },
    );

    // Track the callback promise
    pendingCallbacks.push(callbackPromise);

    // Remove from tracking once complete
    callbackPromise.finally(() => {
      const index = pendingCallbacks.indexOf(callbackPromise);
      if (index > -1) {
        pendingCallbacks.splice(index, 1);
      }
    });
  });

  // Handle process termination
  rl.on("close", async () => {
    try {
      // Wait for all pending callbacks to complete
      if (pendingCallbacks.length > 0) {
        await Promise.all(pendingCallbacks);
      }

      // File synchronization is handled externally by the caller (e.g., exec script)
      // No file pushing is done here to avoid concurrent update conflicts
    } catch (error) {
      console.error(
        chalk.red(
          `[uspark] Error during cleanup: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }

    process.exit(0);
  });
}

/**
 * Send stdout line to callback API
 */
async function sendStdoutCallback(
  context: { token: string; apiUrl: string },
  options: { projectId: string; turnId: string; sessionId: string },
  line: string,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(
      `${context.apiUrl}/api/projects/${options.projectId}/sessions/${options.sessionId}/turns/${options.turnId}/on-claude-stdout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.token}`,
        },
        body: JSON.stringify({ line }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}
