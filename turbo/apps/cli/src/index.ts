import { FOO } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import { authenticate, logout } from "./auth";
import { getToken, getApiUrl } from "./config";
import { ProjectSync } from "./project-sync";

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

program
  .command("ping")
  .description("Ping the API server")
  .action(async () => {
    const response = await fetch(`${API_HOST}/api/health`);
    if (response.ok) {
      const data = (await response.json()) as { status?: string };
      console.log(chalk.green("✓ API is healthy"));
      console.log(chalk.gray(`Status: ${data.status || "OK"}`));
    } else {
      console.log(chalk.red(`✗ API returned ${response.status}`));
      process.exit(1);
    }
  });

program
  .command("auth")
  .description("Authenticate with uSpark")
  .option("--api-url <url>", "API URL", "http://localhost:3000")
  .action(async (options: { apiUrl: string }) => {
    try {
      await authenticate(options.apiUrl);
    } catch {
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Logout from uSpark")
  .action(async () => {
    await logout();
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

export async function pullCommand(
  filePath: string,
  options: { projectId: string; output?: string },
): Promise<void> {
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth' first."),
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
      chalk.red("✗ Not authenticated. Please run 'uspark auth' first."),
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

// Only parse if this is the main module being run directly
// In ESM, we check if the file is being run directly vs imported
// process.argv[1] is undefined when imported as a module
if (process.argv[1]) {
  program.parse();
}
