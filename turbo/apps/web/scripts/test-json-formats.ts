#!/usr/bin/env tsx

/**
 * Test different JSON output formats
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y";

async function test() {
  console.log("🚀 Testing JSON output formats...");

  if (!process.env.E2B_API_KEY || !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  let sandbox: Sandbox | undefined;

  try {
    sandbox = await Sandbox.create(E2B_TEMPLATE_ID, {
      timeout: 300,
      envs: {
        CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      },
    });
    console.log(`✅ Sandbox created: ${sandbox.sandboxId}\n`);

    const prompt = "What is 2+2? Just answer with the number.";

    // Test 1: Default text format
    console.log("📝 Test 1: Default text format (--output-format text)");
    const textResult = await sandbox.commands.run(`echo "${prompt}" | claude --print`);
    console.log("Output:", textResult.stdout);
    console.log("Type:", typeof textResult.stdout);
    console.log("---\n");

    // Test 2: JSON format (single result)
    console.log("📝 Test 2: JSON format (--output-format json)");
    const jsonResult = await sandbox.commands.run(`echo "${prompt}" | claude --print --output-format json`);
    console.log("Raw output:", jsonResult.stdout);
    if (jsonResult.stdout) {
      try {
        const parsed = JSON.parse(jsonResult.stdout);
        console.log("Parsed JSON:", JSON.stringify(parsed, null, 2).slice(0, 500));
      } catch (e) {
        console.log("Failed to parse as JSON");
      }
    }
    console.log("---\n");

    // Test 3: Stream JSON format (realtime streaming)
    console.log("📝 Test 3: Stream JSON format (--output-format stream-json with --verbose)");
    const streamJsonResult = await sandbox.commands.run(`echo "${prompt}" | claude --print --verbose --output-format stream-json`);
    console.log("Raw output (first 500 chars):", streamJsonResult.stdout?.slice(0, 500));
    if (streamJsonResult.stdout) {
      const lines = streamJsonResult.stdout.split('\n').filter(line => line.trim());
      console.log(`\nNumber of JSON lines: ${lines.length}`);
      console.log("\nFirst 3 JSON objects:");
      for (const line of lines.slice(0, 3)) {
        try {
          const parsed = JSON.parse(line);
          console.log(`- ${parsed.type}:`, parsed);
        } catch {
          console.log("- Non-JSON:", line.slice(0, 100));
        }
      }
    }
    console.log("---\n");

    // Test 4: Stream JSON without --verbose (should fail)
    console.log("📝 Test 4: Stream JSON without --verbose (should fail)");
    const streamNoVerboseResult = await sandbox.commands.run(`echo "${prompt}" | claude --print --output-format stream-json 2>&1`);
    console.log("Exit code:", streamNoVerboseResult.exitCode);
    console.log("Output:", streamNoVerboseResult.stdout?.slice(0, 200));

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