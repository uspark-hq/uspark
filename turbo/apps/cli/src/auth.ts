import chalk from "chalk";
import { saveConfig, clearConfig } from "./config";
import type {
  DeviceAuthResponse,
  TokenExchangeSuccess,
  TokenExchangePending,
} from "@uspark/core";

const MAX_POLL_TIME = 900000; // 15 minutes

export async function authenticate(apiUrl: string): Promise<void> {
  console.log(chalk.blue("Starting authentication flow..."));

  try {
    // Step 1: Request device code
    const deviceResponse = await fetch(`${apiUrl}/api/cli/auth/device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!deviceResponse.ok) {
      throw new Error(
        `Failed to get device code: ${deviceResponse.statusText}`,
      );
    }

    const deviceData = (await deviceResponse.json()) as DeviceAuthResponse;

    // Step 2: Display instructions to user
    console.log("\n" + chalk.green("To authenticate, please:"));
    console.log(
      chalk.white(`1. Visit: ${chalk.underline(deviceData.verification_url)}`),
    );
    console.log(
      chalk.white(`2. Enter code: ${chalk.bold.yellow(deviceData.user_code)}`),
    );
    console.log(chalk.gray("\nWaiting for authentication..."));

    // Step 3: Poll for token
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((resolve) =>
        setTimeout(resolve, deviceData.interval * 1000),
      );

      const tokenResponse = await fetch(`${apiUrl}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceData.device_code }),
      });

      if (!tokenResponse.ok) {
        const errorData = (await tokenResponse.json()) as { error?: string };
        if (errorData.error === "expired_device_code") {
          throw new Error("Device code expired. Please try again.");
        }
        // Continue polling for other errors
        continue;
      }

      const tokenData = (await tokenResponse.json()) as
        | TokenExchangeSuccess
        | TokenExchangePending;

      if ("pending" in tokenData && tokenData.pending) {
        // Still waiting for user authorization
        process.stdout.write(".");
        continue;
      }

      if ("access_token" in tokenData && tokenData.access_token) {
        // Success! Save token
        await saveConfig({
          token: tokenData.access_token,
          apiUrl: apiUrl,
        });

        console.log("\n" + chalk.green("✓ Authentication successful!"));
        console.log(chalk.gray(`Token saved to ~/.uspark/config.json`));
        return;
      }
    }

    throw new Error("Authentication timed out. Please try again.");
  } catch (error) {
    console.error(
      chalk.red(
        `Authentication failed: ${error instanceof Error ? error.message : error}`,
      ),
    );
    throw error;
  }
}

export async function logout(): Promise<void> {
  await clearConfig();
  console.log(chalk.green("✓ Logged out successfully"));
}
