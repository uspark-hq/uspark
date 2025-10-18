import { createInterface } from "readline";
import chalk from "chalk";
import { requireAuth, syncFile } from "./shared";

interface ClaudeEvent {
  type: "system" | "assistant" | "user" | "result" | "tool_result";
  subtype?: string;
  message?: {
    id: string;
    type: "message";
    role: "assistant" | "user";
    content: Array<{
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string; // For tool_result items
    }>;
  };
  tool_use_id?: string;
  content?: string;
}

function isFileModificationTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): boolean {
  const fileModificationTools = ["Edit", "Write", "MultiEdit", "NotebookEdit"];

  // Check if the tool is one of the file modification tools
  if (!fileModificationTools.includes(toolName)) {
    return false;
  }

  // Additional check: ensure the tool has a file_path parameter
  return "file_path" in toolInput && typeof toolInput.file_path === "string";
}

function extractFilePath(
  toolName: string,
  toolInput: Record<string, unknown>,
  prefix?: string,
): string | null {
  // All file modification tools use 'file_path' parameter
  const filePath = toolInput.file_path;

  if (typeof filePath === "string") {
    let relativePath: string;

    // Convert absolute paths to relative paths
    if (filePath.startsWith("/")) {
      // Absolute path - check if it's within the current working directory
      const cwd = process.cwd();
      if (filePath.startsWith(cwd)) {
        relativePath = filePath.substring(cwd.length + 1); // Remove leading slash
      } else {
        // Outside current directory - don't sync
        return null;
      }
    } else {
      // Already a relative path
      relativePath = filePath;
    }

    // If prefix is specified, filter and strip it
    if (prefix) {
      // Normalize prefix - ensure it doesn't have leading/trailing slashes
      const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");

      // Check if file is under the prefix directory
      if (
        relativePath === normalizedPrefix ||
        relativePath.startsWith(normalizedPrefix + "/")
      ) {
        // Strip the prefix from the path
        if (relativePath === normalizedPrefix) {
          // Edge case: file path exactly matches prefix
          return "";
        }
        return relativePath.substring(normalizedPrefix.length + 1);
      } else {
        // File is not under the prefix directory - ignore it
        return null;
      }
    }

    return relativePath;
  }

  return null;
}

export async function watchClaudeCommand(options: {
  projectId: string;
  turnId: string;
  sessionId: string;
  prefix?: string;
}): Promise<void> {
  const context = await requireAuth();

  // Track pending file operations: tool_use_id -> file_path
  const pendingFileOps = new Map<string, string>();

  // Track pending sync promises to wait for them before exiting
  const pendingSyncs: Array<Promise<void>> = [];

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
    let event: ClaudeEvent;
    try {
      event = JSON.parse(line);
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

    // Step 1: Track tool_use events for file modification tools
    if (event.type === "assistant" && event.message?.content) {
      for (const contentItem of event.message.content) {
        if (
          contentItem.type === "tool_use" &&
          contentItem.name &&
          contentItem.input &&
          contentItem.id
        ) {
          const toolName = contentItem.name;
          const toolInput = contentItem.input;

          // Check for file modification tools
          if (isFileModificationTool(toolName, toolInput)) {
            const filePath = extractFilePath(
              toolName,
              toolInput,
              options.prefix,
            );

            if (filePath) {
              // Store for later sync after tool_result
              pendingFileOps.set(contentItem.id, filePath);
            }
          }
        }
      }
    }

    // Step 2: Sync files after tool_result (file is now created/modified)
    // tool_result events come as type:"user" with content containing tool_result items
    if (event.type === "user" && event.message?.content) {
      for (const contentItem of event.message.content) {
        // Check if this content item is a tool_result with a tool_use_id
        const toolUseId =
          contentItem.type === "tool_result" &&
          "tool_use_id" in contentItem &&
          typeof contentItem.tool_use_id === "string"
            ? contentItem.tool_use_id
            : null;

        if (toolUseId) {
          const filePath = pendingFileOps.get(toolUseId);

          if (filePath) {
            // Create a sync promise and track it
            const syncPromise = (async () => {
              try {
                // File was successfully modified, sync it now
                // When using prefix, reconstruct the local path for reading
                const localPath = options.prefix
                  ? `${options.prefix}/${filePath}`
                  : filePath;
                await syncFile(context, options.projectId, filePath, localPath);
              } catch (error) {
                // Only output errors to stderr
                console.error(
                  chalk.red(
                    `[uspark] Failed to sync ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
                  ),
                );
              } finally {
                // Remove from pending regardless of success
                pendingFileOps.delete(toolUseId);
              }
            })();

            // Track the sync promise
            pendingSyncs.push(syncPromise);

            // Remove from tracking once complete
            syncPromise.finally(() => {
              const index = pendingSyncs.indexOf(syncPromise);
              if (index > -1) {
                pendingSyncs.splice(index, 1);
              }
            });
          }
        }
      }
    }
  });

  // Handle process termination
  rl.on("close", async () => {
    // Wait for all pending operations to complete before exiting
    const allPending = [...pendingSyncs, ...pendingCallbacks];
    if (allPending.length > 0) {
      await Promise.all(allPending);
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
