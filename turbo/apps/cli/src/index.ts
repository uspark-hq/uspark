import { FOO } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import { authenticate, logout, checkAuthStatus } from "./auth";
import { pullCommand, pushCommand } from "./commands/sync";
import { watchClaudeCommand } from "./commands/watch-claude";
import { claudeWorkerCommand } from "./commands/claude-worker";

const getApiUrl = () => process.env.API_HOST || "https://www.uspark.ai";

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
  .description("Pull all files from remote project to current directory")
  .option(
    "--project-id <projectId>",
    "Project ID (required on first run, saved to .config.json)",
  )
  .option("--verbose", "Show detailed logging information")
  .action(async (options: { projectId?: string; verbose?: boolean }) => {
    await pullCommand(options);
  });

program
  .command("push")
  .description("Push all files from current directory to remote project")
  .option(
    "--project-id <projectId>",
    "Project ID (required on first run, saved to .config.json)",
  )
  .action(async (options: { projectId?: string }) => {
    await pushCommand(options);
  });

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
  .option("--verbose", "Show full JSON output instead of just result field")
  .action(
    async (options: {
      projectId: string;
      turnId: string;
      sessionId: string;
      prefix?: string;
      verbose?: boolean;
    }) => {
      await watchClaudeCommand(options);
    },
  );

program
  .command("claude-worker")
  .description("Run Claude as a continuous worker to process tasks")
  .requiredOption("--project-id <projectId>", "Project ID to sync changes to")
  .option("--verbose", "Show full JSON output instead of just result field")
  .action(async (options: { projectId: string; verbose?: boolean }) => {
    await claudeWorkerCommand(options);
  });

export { program };

if (
  process.argv[1]?.endsWith("index.js") ||
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("uspark")
) {
  program.parse();
}
