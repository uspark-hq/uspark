#!/usr/bin/env tsx

/**
 * Simple E2B Claude test - minimal version
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y";

async function test() {
  console.log("🚀 Simple E2B Claude test...");

  if (!process.env.E2B_API_KEY) {
    console.error("❌ E2B_API_KEY required");
    process.exit(1);
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error("❌ CLAUDE_CODE_OAUTH_TOKEN required");
    process.exit(1);
  }

  let sandbox: Sandbox | undefined;

  try {
    // Create sandbox
    console.log("📦 Creating sandbox...");
    sandbox = await Sandbox.create(E2B_TEMPLATE_ID, {
      timeout: 300,
      envs: {
        CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      },
    });
    console.log(`✅ Sandbox created: ${sandbox.sandboxId}`);

    // Check Claude
    console.log("\n🔍 Checking Claude...");
    const versionResult = await sandbox.commands.run("claude --version");
    console.log("Claude version:", versionResult.stdout);

    // Check token
    const tokenCheck = await sandbox.commands.run('echo "Token length: ${#CLAUDE_CODE_OAUTH_TOKEN}"');
    console.log(tokenCheck.stdout);

    // Simple test with timeout
    console.log("\n🧪 Testing Claude execution...");
    const testResult = await sandbox.commands.run('echo "test" | timeout 30 claude --print 2>&1');
    console.log("Exit code:", testResult.exitCode);
    console.log("Output:", testResult.stdout || "(empty)");
    console.log("Stderr:", testResult.stderr || "(empty)");

    if (testResult.exitCode === 124) {
      console.log("❌ Claude timed out - checking what's wrong...");

      // Try to debug
      const debugResult = await sandbox.commands.run('timeout 5 claude --debug --print "hi" 2>&1');
      console.log("Debug output:", debugResult.stdout?.slice(0, 500));
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (sandbox) {
      console.log("\n🧹 Cleaning up...");
      await sandbox.kill();
    }
  }
}

test().catch(console.error);