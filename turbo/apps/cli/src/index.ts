import { FOO } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import { authenticate, logout, checkAuthStatus } from "./auth";
import { pullCommand, pullAllCommand, pushCommand } from "./commands/sync";
import { watchClaudeCommand } from "./commands/watch-claude";

const getApiUrl = () => process.env.API_HOST || "https://www.uspark.ai";

const program = new Command();

// CLI configuration and version
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
    console.log(`API Host: ${getApiUrl()}`);
  });

const authCommand = program
  .command("auth")
  .description("Authentication commands");

authCommand
  .command("login")
  .description("Log in to uSpark (use API_HOST env var to set API URL)")
  .action(async () => {
    await authenticate(getApiUrl());
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
  .description("Pull file(s) from remote project")
  .argument(
    "[filePath]",
    "File path to pull (omit with --all to pull entire project)",
  )
  .requiredOption("--project-id <projectId>", "Project ID")
  .option(
    "--output-dir <directory>",
    "Output directory for pulled files (defaults to current directory)",
  )
  .option("--all", "Pull all files from the project")
  .option(
    "--prefix <prefix>",
    "Only pull files with this path prefix (use with --all)",
  )
  .option("--verbose", "Show detailed logging information")
  .action(
    async (
      filePath: string | undefined,
      options: {
        projectId: string;
        outputDir?: string;
        all?: boolean;
        prefix?: string;
        verbose?: boolean;
      },
    ) => {
      if (options.all) {
        // Pull all files (optionally filtered by prefix)
        await pullAllCommand({
          projectId: options.projectId,
          outputDir: options.outputDir,
          prefix: options.prefix,
          verbose: options.verbose,
        });
      } else if (filePath) {
        // Pull single file
        await pullCommand(filePath, {
          projectId: options.projectId,
          outputDir: options.outputDir,
          verbose: options.verbose,
        });
      } else {
        console.error(
          chalk.red("Error: Either provide a file path or use --all flag"),
        );
        process.exit(1);
      }
    },
  );

program
  .command("push")
  .description("Push file(s) to remote project")
  .argument("[filePath]", "File path to push (required unless using --all)")
  .requiredOption("--project-id <projectId>", "Project ID")
  .option("--all", "Push all files in current directory")
  .action(
    async (
      filePath: string | undefined,
      options: { projectId: string; all?: boolean },
    ) => {
      // Validate arguments
      if (!options.all && !filePath) {
        console.error(
          chalk.red("Error: File path is required unless using --all flag"),
        );
        process.exit(1);
      }

      await pushCommand(filePath, options);
    },
  );

program
  .command("watch-claude")
  .description("Watch Claude's JSON output and sync file changes in real-time")
  .requiredOption("--project-id <projectId>", "Project ID to sync changes to")
  .requiredOption("--turn-id <turnId>", "Turn ID for callback API")
  .requiredOption("--session-id <sessionId>", "Session ID for callback API")
  .option(
    "--prefix <prefix>",
    "Only watch files under this prefix directory and strip it when uploading",
  )
  .action(
    async (options: {
      projectId: string;
      turnId: string;
      sessionId: string;
      prefix?: string;
    }) => {
      await watchClaudeCommand(options);
    },
  );

// Export for testing
export { program };

// Parse arguments when run directly
// Check if this file is being executed directly as a CLI
// Also check for 'uspark' in the command name for global installs
if (
  process.argv[1]?.endsWith("index.js") ||
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("uspark")
) {
  program.parse();
}
// Trigger CLI E2E tests
