import { chromium } from "playwright";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { spawn, ChildProcess } from "child_process";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

/**
 * Automate CLI authentication flow
 *
 * Prerequisites:
 * - CLI must be installed globally: cd turbo/apps/cli && pnpm link --global
 *
 * Steps:
 * 1. Start CLI auth command
 * 2. Parse device code
 * 3. Use Playwright to auto-login and enter code
 *
 * @param apiHost - API server address, defaults to environment variable API_HOST or localhost:3000
 */
export async function automateCliAuth(apiHost?: string) {
  let cliProcess: ChildProcess | null = null;
  let browser = null;

  try {
    console.log("🚀 Starting CLI authentication flow...");

    // Step 1: Start CLI auth command
    // Use provided apiHost or environment variable API_HOST, defaults to localhost:3000
    const apiUrl = apiHost || process.env.API_HOST || "http://localhost:3000";
    console.log(`📡 Connecting to API: ${apiUrl}`);

    // Always use globally installed uspark command
    // Both GitHub Actions and local development should install CLI via pnpm link --global first
    cliProcess = spawn("uspark", ["auth", "login"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        API_HOST: apiUrl  // Set API_HOST environment variable
      }
    });

    // Step 2: Capture and parse device code and URL
    let cliOutput = "";
    const { deviceCode, authUrl } = await new Promise<{ deviceCode: string; authUrl: string }>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => {
        reject(new Error("Timeout: Unable to get device code"));
      }, 10000);

      cliProcess!.stdout?.on("data", (data) => {
        output += data.toString();
        console.log(data.toString());

        // Match device code format: XXXX-XXXX
        const codeMatch = output.match(/enter this code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i);
        const urlMatch = output.match(/visit:\s*(https?:\/\/[^\s]+\/cli-auth)/i);

        if (codeMatch) {
          clearTimeout(timeout);
          cliOutput = output;
          resolve({
            deviceCode: codeMatch[1],
            authUrl: urlMatch ? urlMatch[1] : `${apiUrl}/cli-auth`
          });
        }
      });

      cliProcess!.stderr?.on("data", (data) => {
        console.error("CLI error:", data.toString());
      });

      cliProcess!.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log(`✅ Got device code: ${deviceCode}`);

    // Step 3: Launch browser and complete authentication
    browser = await chromium.launch({
      headless: true, // Run in headless mode
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Step 4: Setup Clerk authentication
    await clerkSetup();

    // Step 5: Login to Clerk
    // Use configured API URL
    const baseUrl = apiUrl;

    await page.goto(baseUrl);
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    console.log("✅ Clerk login successful");
    console.log(`🔗 Visiting auth page: ${baseUrl}/cli-auth`);

    // Step 6: Visit CLI auth page
    await page.goto(`${baseUrl}/cli-auth`);
    await page.waitForLoadState("networkidle");

    // Step 7: Enter device code
    // Device code format: XXXX-XXXX, needs to be entered into multiple input boxes
    console.log(`📝 Entering device code: ${deviceCode}`);

    // Remove hyphen to get pure characters
    const codeChars = deviceCode.replace('-', '');

    // Find all input boxes
    const codeInputs = await page.locator('input[type="text"], input[maxlength="1"]').all();
    console.log(`🔍 Found ${codeInputs.length} input boxes`);

    // Enter each character into corresponding input box
    for (let i = 0; i < codeChars.length && i < codeInputs.length; i++) {
      await codeInputs[i].fill(codeChars[i]);
      // Add small delay to simulate real input
      await page.waitForTimeout(50);
    }

    console.log(`✅ Device code entered: ${deviceCode}`);

    // Debug: Screenshot to see page state
    await page.screenshot({ path: 'debug-before-submit.png' });

    // Find and click Authorize Device button
    const authorizeButton = await page.locator('button:has-text("Authorize Device")');
    const buttonExists = await authorizeButton.count() > 0;

    if (buttonExists) {
      console.log("✅ Found Authorize Device button");

      // Click button
      await authorizeButton.first().click();
      console.log("✅ Clicked Authorize Device button");

      // Wait for page response
      await page.waitForTimeout(2000);

      // Screenshot to see post-click state
      await page.screenshot({ path: 'debug-after-click.png' });
      console.log("📸 Saved post-click screenshot");
    } else {
      console.log("❌ Authorize Device button not found");
      // Try pressing Enter
      await codeInput.press('Enter');
      console.log("⏳ Trying Enter to submit");
    }

    console.log("⏳ Waiting for auth response...");

    // Step 9: Wait for authentication success
    // Can verify via page prompt or CLI output
    await page.waitForSelector('text=/success|verified|completed/i', {
      timeout: 10000,
    }).catch(() => {
      console.log("⚠️  Success message not found, but authentication may have succeeded");
    });

    // Wait for CLI process to complete authentication
    const authSuccess = await new Promise<boolean>((resolve) => {
      if (!cliProcess) {
        resolve(false);
        return;
      }

      let resolved = false;

      // Listen for success message in CLI output
      cliProcess.stdout?.on("data", (data) => {
        const output = data.toString();

        // Only print non-empty output
        if (output.trim()) {
          console.log("CLI:", output.trim());
        }

        if (output.includes("Authentication successful") ||
            output.includes("Successfully authenticated") ||
            output.includes("✓ Authentication complete") ||
            output.includes("✓")) {
          if (!resolved) {
            console.log("🎉 Authentication success detected!");
            resolved = true;
            resolve(true);
          }
        }
      });

      cliProcess.stderr?.on("data", (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error("CLI error:", error);
        }
      });

      cliProcess.on("exit", (code) => {
        if (!resolved) {
          console.log(`CLI process exited with code: ${code}`);
          resolved = true;
          resolve(code === 0);
        }
      });

      // Increase timeout duration
      setTimeout(() => {
        if (!resolved) {
          console.log("⏱️ Timeout (15s), checking auth status...");
          resolved = true;
          resolve(false);
        }
      }, 15000);
    });

    if (!authSuccess) {
      throw new Error("CLI authentication appears to have failed");
    }

    console.log("🎉 CLI authentication flow complete!");

    // Verify auth file was created
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const configPath = path.join(os.homedir(), ".uspark", "config.json");

    if (fs.existsSync(configPath)) {
      console.log("✅ Auth file created:", configPath);
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.token) {
        console.log("✅ Auth token saved");
      }
    } else {
      console.log("⚠️  Warning: Auth file not found, may need retry");
    }

  } catch (error) {
    console.error("❌ Authentication failed:", error);
    throw error;
  } finally {
    // Clean up resources
    if (browser) {
      await browser.close();
    }
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill();
    }
  }
}

// If running this script directly
if (require.main === module) {
  // Can specify API_HOST via command line argument or environment variable
  const apiHost = process.argv[2] || process.env.API_HOST;

  automateCliAuth(apiHost)
    .then(() => {
      console.log("✅ Automated authentication completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Automated authentication failed:", error);
      process.exit(1);
    });
}