#!/usr/bin/env tsx

/**
 * Final E2B Claude test - correct command format
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y";

async function test() {
  console.log("🚀 Final E2B Claude test with correct format...");

  if (!process.env.E2B_API_KEY || !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  let sandbox: Sandbox | undefined;

  try {
    // Create sandbox
    sandbox = await Sandbox.create(E2B_TEMPLATE_ID, {
      timeout: 300,
      envs: {
        CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      },
    });
    console.log(`✅ Sandbox created: ${sandbox.sandboxId}`);

    // Test 1: Simple --print mode
    console.log("\n📝 Test 1: Simple --print mode");
    const simpleResult = await sandbox.commands.run('claude --print "Hello! Please respond with a simple greeting."');
    console.log("Response:", simpleResult.stdout);

    // Test 2: Using prompt file with -p flag
    console.log("\n📝 Test 2: Using prompt file");
    const prompt = "What is 2+2? Just give the number.";
    await sandbox.files.write("/tmp/test.txt", prompt);
    const fileResult = await sandbox.commands.run('claude -p /tmp/test.txt');
    console.log("Response:", fileResult.stdout);

    // Test 3: Stream JSON format with --verbose
    console.log("\n📝 Test 3: Stream JSON format");
    const jsonResult = await sandbox.commands.run('claude --print --verbose --output-format stream-json "Say hello in JSON"');
    console.log("Raw JSON output:", jsonResult.stdout?.slice(0, 500));

    // Parse JSON lines
    if (jsonResult.stdout) {
      const lines = jsonResult.stdout.split('\n').filter(line => line.trim());
      console.log("\nParsed JSON blocks:");
      for (const line of lines.slice(0, 5)) { // First 5 lines
        try {
          const parsed = JSON.parse(line);
          console.log("-", parsed.type, ":",
            parsed.content || parsed.text || JSON.stringify(parsed).slice(0, 100));
        } catch {
          console.log("- non-JSON:", line.slice(0, 100));
        }
      }
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