import chalk from "chalk";
import { delay } from "signal-timers";
import { saveConfig, clearConfig, loadConfig, getApiUrl } from "./config";

async function requestDeviceCode(apiUrl: string): Promise<{
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}> {
  const response = await fetch(`${apiUrl}/api/cli/auth/device`, {
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
    interval: number;
  }>;
}

async function exchangeToken(
  apiUrl: string,
  deviceCode: string,
): Promise<{
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}> {
  const response = await fetch(`${apiUrl}/api/cli/auth/token`, {
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

export async function authenticate(apiUrl?: string): Promise<void> {
  // Use provided apiUrl or get from config/env
  const targetApiUrl = apiUrl || (await getApiUrl());
  console.log(chalk.blue("🔐 Initiating authentication..."));

  // Request device code
  const deviceAuth = await requestDeviceCode(targetApiUrl);

  console.log(chalk.green("\n✓ Device code generated"));

  // Construct verification URL from API URL
  const verificationUrl = `${targetApiUrl}/cli-auth`;
  console.log(chalk.cyan(`\nTo authenticate, visit: ${verificationUrl}`));
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
  const pollInterval = (deviceAuth.interval || 5) * 1000; // Use server-specified interval or default to 5 seconds

  let isFirstPoll = true;

  while (Date.now() - startTime < maxWaitTime) {
    // Skip delay on first poll for faster response
    if (!isFirstPoll) {
      await delay(pollInterval); // Use dynamic polling interval
    }
    isFirstPoll = false;

    const tokenResult = await exchangeToken(
      targetApiUrl,
      deviceAuth.device_code,
    );

    if (tokenResult.access_token) {
      // Success! Store the token
      await saveConfig({
        token: tokenResult.access_token,
        apiUrl: targetApiUrl,
      });

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
}

export async function logout(): Promise<void> {
  await clearConfig();
  console.log(chalk.green("✓ Successfully logged out"));
  console.log(chalk.gray("Your credentials have been cleared."));
}

export async function checkAuthStatus(): Promise<void> {
  const config = await loadConfig();

  if (config.token) {
    console.log(chalk.green("✓ Authenticated"));
    console.log(chalk.gray("You are logged in to uSpark."));
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
}
