import { FOO, FileSystem } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Configuration and storage
const CONFIG_DIR = path.join(os.homedir(), ".uspark");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const API_BASE_URL = "https://app.uspark.com";

interface Config {
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): Config {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  }
  return {};
}

function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

async function requestDeviceCode(): Promise<{
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to request device code: ${response.statusText}`);
  }

  return response.json() as Promise<{
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_in: number;
  }>;
}

async function exchangeToken(deviceCode: string): Promise<{
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/cli/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });

  return response.json() as Promise<{
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }>;
}

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
  .action(async () => {
    console.log(chalk.blue("🔐 Initiating authentication..."));

    // Request device code
    const deviceAuth = await requestDeviceCode();

    console.log(chalk.green("\n✓ Device code generated"));
    console.log(
      chalk.cyan(`\nTo authenticate, visit: ${deviceAuth.verification_url}`),
    );
    console.log(
      chalk.yellow(`And enter this code: ${chalk.bold(deviceAuth.user_code)}`),
    );
    console.log(
      chalk.gray(
        `\nThe code expires in ${Math.floor(deviceAuth.expires_in / 60)} minutes.`,
      ),
    );

    console.log(chalk.blue("\n⏳ Waiting for authentication..."));

    // Poll for token
    const startTime = Date.now();
    const maxWaitTime = deviceAuth.expires_in * 1000; // Convert to milliseconds

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const tokenResult = await exchangeToken(deviceAuth.device_code);

      if (tokenResult.access_token) {
        // Success! Store the token
        const config: Config = {
          token: tokenResult.access_token,
        };

        saveConfig(config);

        console.log(chalk.green("\n✓ Authentication successful!"));
        console.log(chalk.gray("Your credentials have been saved."));
        return;
      }

      if (tokenResult.error === "authorization_pending") {
        // Still waiting for user to authenticate
        process.stdout.write(chalk.gray("."));
        continue;
      }

      // Handle other errors
      if (tokenResult.error === "expired_token") {
        console.log(
          chalk.red("\n✗ The device code has expired. Please try again."),
        );
        process.exit(1);
      }

      if (tokenResult.error) {
        console.log(
          chalk.red(
            `\n✗ Authentication failed: ${tokenResult.error_description || tokenResult.error}`,
          ),
        );
        process.exit(1);
      }
    }

    // Timeout
    console.log(chalk.red("\n✗ Authentication timed out. Please try again."));
    process.exit(1);
  });

authCommand
  .command("logout")
  .description("Log out of uSpark")
  .action(() => {
    clearConfig();
    console.log(chalk.green("✓ Successfully logged out"));
    console.log(chalk.gray("Your credentials have been cleared."));
  });

authCommand
  .command("status")
  .description("Show current authentication status")
  .action(() => {
    const config = loadConfig();

    if (config.token) {
      console.log(chalk.green("✓ Authenticated"));
      console.log(chalk.gray("You are logged in to uSpark."));

      if (config.user) {
        console.log(chalk.gray(`User: ${config.user.email}`));
      }
    } else {
      console.log(chalk.yellow("⚠ Not authenticated"));
      console.log(chalk.gray("Run 'uspark auth login' to authenticate."));
    }

    // Also check for environment variable
    if (process.env.USPARK_TOKEN) {
      console.log(
        chalk.blue("ℹ Using token from USPARK_TOKEN environment variable"),
      );
    }
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
      try {
        await pullCommand(filePath, options);
      } catch (error) {
        console.error(
          chalk.red(
            `✗ Failed to pull file: ${error instanceof Error ? error.message : error}`,
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
  console.log(
    chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`),
  );

  const fs = new FileSystem();
  await fs.pullFile(options.projectId, filePath, options.output);

  const outputPath = options.output || filePath;
  console.log(chalk.green(`✓ Successfully pulled to ${outputPath}`));
}

// Parse arguments when run directly (not when imported for testing)
// Check if this is the main module being run
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
