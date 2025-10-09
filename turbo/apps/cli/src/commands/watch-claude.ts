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
): string | null {
  // All file modification tools use 'file_path' parameter
  const filePath = toolInput.file_path;

  if (typeof filePath === "string") {
    // Return relative path if it's within the current working directory
    // This ensures we only sync files within the project
    if (filePath.startsWith("/")) {
      // Absolute path - check if it's within the current working directory
      const cwd = process.cwd();
      if (filePath.startsWith(cwd)) {
        return filePath.substring(cwd.length + 1); // Remove leading slash
      }
      // Outside current directory - don't sync
      return null;
    }
    // Already a relative path
    return filePath;
  }

  return null;
}

export async function watchClaudeCommand(options: {
  projectId: string;
}): Promise<void> {
  const context = await requireAuth();

  // Track pending file operations: tool_use_id -> file_path
  const pendingFileOps = new Map<string, string>();

  // Track pending sync promises to wait for them before exiting
  const pendingSyncs: Array<Promise<void>> = [];

  // Create readline interface to process stdin line by line
  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    // Always pass through the output transparently
    console.log(line);

    // Parse JSON line - all input should be valid JSON from Claude CLI
    const event: ClaudeEvent = JSON.parse(line);

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
            const filePath = extractFilePath(toolName, toolInput);

            if (filePath) {
              // Store for later sync after tool_result
              pendingFileOps.set(contentItem.id, filePath);
            }
          }
        }
      }
    }

    // Step 2: Sync files after tool_result (file is now created/modified)
    if (event.type === "tool_result" && event.tool_use_id) {
      const filePath = pendingFileOps.get(event.tool_use_id);

      if (filePath) {
        // Create a sync promise and track it
        const syncPromise = (async () => {
          try {
            // File was successfully modified, sync it now
            await syncFile(context, options.projectId, filePath);

            // Log sync success (to stderr to not interfere with stdout)
            console.error(chalk.dim(`[uspark] ✓ Synced ${filePath}`));
          } catch (error) {
            console.error(
              chalk.red(
                `[uspark] ✗ Failed to sync ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          } finally {
            // Remove from pending regardless of success
            if (event.tool_use_id) {
              pendingFileOps.delete(event.tool_use_id);
            }
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
  });

  // Handle process termination
  rl.on("close", async () => {
    // Wait for all pending syncs to complete before exiting
    if (pendingSyncs.length > 0) {
      await Promise.all(pendingSyncs);
    }
    process.exit(0);
  });
}
