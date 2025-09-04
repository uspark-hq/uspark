import { FOO } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import { createInterface } from "readline";
import { authenticate, logout, checkAuthStatus } from "./auth";
import { getToken, getApiUrl } from "./config";
import { ProjectSync } from "./project-sync";

const program = new Command();

program
  .name("uspark")
  .description("uSpark CLI - A modern build tool")
  .version("0.1.0");

program
  .command("hello")
  .description("Say hello from the App")
  .action(() => {
    console.log(chalk.blue("Welcome to the uSpark CLI!"));
    console.log(chalk.green(`Core says: ${FOO}`));
  });

program
  .command("info")
  .description("Display environment information")
  .action(() => {
    console.log(chalk.cyan("System Information:"));
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
  });

const authCommand = program
  .command("auth")
  .description("Authentication commands");

authCommand
  .command("login")
  .description("Log in to uSpark")
  .option("--api-url <url>", "API URL", "https://app.uspark.com")
  .action(async (options: { apiUrl: string }) => {
    await authenticate(options.apiUrl);
  });

authCommand
  .command("logout")
  .description("Log out of uSpark")
  .action(async () => {
    await logout();
  });

authCommand
  .command("status")
  .description("Show current authentication status")
  .action(async () => {
    await checkAuthStatus();
  });

program
  .command("pull")
  .description("Pull a file from remote project")
  .argument("<filePath>", "File path to pull")
  .requiredOption("--project-id <projectId>", "Project ID")
  .option(
    "--output <outputPath>",
    "Local output path (defaults to same as remote path)",
  )
  .action(
    async (
      filePath: string,
      options: { projectId: string; output?: string },
    ) => {
      await pullCommand(filePath, options);
    },
  );

program
  .command("push")
  .description("Push a file to remote project")
  .argument("<filePath>", "File path to push")
  .requiredOption("--project-id <projectId>", "Project ID")
  .option(
    "--source <sourcePath>",
    "Local source path (defaults to same as remote path)",
  )
  .action(
    async (
      filePath: string,
      options: { projectId: string; source?: string },
    ) => {
      try {
        await pushCommand(filePath, options);
      } catch (error) {
        console.error(
          chalk.red(
            `✗ Failed to push file: ${error instanceof Error ? error.message : error}`,
          ),
        );
        process.exit(1);
      }
    },
  );

program
  .command("watch-claude")
  .description("Watch Claude's JSON output and sync file changes in real-time")
  .requiredOption("--project-id <projectId>", "Project ID to sync changes to")
  .action(async (options: { projectId: string }) => {
    await watchClaudeCommand(options);
  });

export async function pullCommand(
  filePath: string,
  options: { projectId: string; output?: string },
): Promise<void> {
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();

  console.log(
    chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`),
  );

  const sync = new ProjectSync();
  await sync.pullFile(options.projectId, filePath, options.output, {
    token,
    apiUrl,
  });

  const outputPath = options.output || filePath;
  console.log(chalk.green(`✓ Successfully pulled to ${outputPath}`));
}

export async function pushCommand(
  filePath: string,
  options: { projectId: string; source?: string },
): Promise<void> {
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();

  const sourcePath = options.source || filePath;
  console.log(
    chalk.blue(
      `Pushing ${sourcePath} to project ${options.projectId} as ${filePath}...`,
    ),
  );

  const sync = new ProjectSync();
  await sync.pushFile(options.projectId, filePath, options.source, {
    token,
    apiUrl,
  });

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}

interface ClaudeEvent {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    id: string;
    type: "message";
    role: "assistant" | "user";
    content: Array<{
      type: "text" | "tool_use";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
}

function isFileModificationTool(toolName: string, toolInput: Record<string, unknown>): boolean {
  const fileModificationTools = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
  
  // Check if the tool is one of the file modification tools
  if (!fileModificationTools.includes(toolName)) {
    return false;
  }
  
  // Additional check: ensure the tool has a file_path parameter
  return 'file_path' in toolInput && typeof toolInput.file_path === 'string';
}

function extractFilePath(toolName: string, toolInput: Record<string, unknown>): string | null {
  // All file modification tools use 'file_path' parameter
  const filePath = toolInput.file_path;
  
  if (typeof filePath === 'string') {
    // Return relative path if it's within the current working directory
    // This ensures we only sync files within the project
    if (filePath.startsWith('/')) {
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

export async function watchClaudeCommand(options: { projectId: string }): Promise<void> {
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();
  const sync = new ProjectSync();

  // Create readline interface to process stdin line by line
  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    // Always pass through the output transparently
    console.log(line);

    // Try to parse as JSON to detect Claude events
    try {
      const event: ClaudeEvent = JSON.parse(line);
      
      // Check if this is an assistant message with tool use
      if (event.type === "assistant" && event.message?.content) {
        for (const contentItem of event.message.content) {
          if (contentItem.type === "tool_use" && contentItem.name && contentItem.input) {
            const toolName = contentItem.name;
            const toolInput = contentItem.input;
            
            // Check for file modification tools
            if (isFileModificationTool(toolName, toolInput)) {
              const filePath = extractFilePath(toolName, toolInput);
              
              if (filePath) {
                try {
                  // Trigger push operation in background
                  await sync.pushFile(options.projectId, filePath, undefined, {
                    token,
                    apiUrl,
                  });
                  
                  // Log sync success (to stderr to not interfere with stdout)
                  console.error(chalk.dim(`[uspark] ✓ Synced ${filePath}`));
                } catch (error) {
                  // Log errors to stderr but don't interrupt the main flow
                  console.error(
                    chalk.dim(
                      `[uspark] ✗ Failed to sync ${filePath}: ${error instanceof Error ? error.message : error}`
                    )
                  );
                }
              }
            }
          }
        }
      }
    } catch {
      // Not JSON or parsing failed - this is normal for non-JSON output
      // Do nothing, just continue
    }
  });

  // Handle process termination
  rl.on("close", () => {
    process.exit(0);
  });
}

// Parse arguments when run directly (not when imported for testing)
// Check if this is the main module being run
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
