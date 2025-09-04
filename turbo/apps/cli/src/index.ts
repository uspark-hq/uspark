import { FOO } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import { authenticate, logout, checkAuthStatus } from "./auth";
import { pullCommand, pushCommand } from "./commands/sync";
import { watchClaudeCommand } from "./commands/watch-claude";

const API_HOST = process.env.API_HOST || "https://api.uspark.com";

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
    console.log(`API Host: ${API_HOST}`);
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
  .description("Push file(s) to remote project")
  .argument("[filePath]", "File path to push (required unless using --all)")
  .requiredOption("--project-id <projectId>", "Project ID")
  .option(
    "--source <sourcePath>",
    "Local source path (defaults to same as remote path)",
  )
  .option("--all", "Push all files in current directory")
  .action(
    async (
      filePath: string | undefined,
      options: { projectId: string; source?: string; all?: boolean },
    ) => {
      try {
        // Validate arguments
        if (!options.all && !filePath) {
          console.error(
            chalk.red("Error: File path is required unless using --all flag"),
          );
          process.exit(1);
        }
        
        await pushCommand(filePath, options);
      } catch (error) {
        console.error(
          chalk.red(
            `✗ Failed to push: ${error instanceof Error ? error.message : error}`,
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

// Parse arguments when run directly (not when imported for testing)
// Check if this is the main module being run
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
