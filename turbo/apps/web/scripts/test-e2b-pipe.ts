#!/usr/bin/env tsx

/**
 * E2B Claude pipe test - testing pipe input method
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y";

async function test() {
  console.log("🚀 E2B Claude pipe test...");

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

    // Test different pipe methods
    const tests = [
      {
        name: "Echo pipe with --print",
        cmd: 'echo "Hello, please respond with a greeting" | claude --print',
      },
      {
        name: "Cat pipe with --print",
        cmd: 'echo "What is 2+2?" > /tmp/q.txt && cat /tmp/q.txt | claude --print',
      },
      {
        name: "Echo pipe with --print and JSON",
        cmd: 'echo "Say hello" | claude --print --verbose --output-format stream-json',
      },
    ];

    for (const test of tests) {
      console.log(`📝 Testing: ${test.name}`);
      console.log(`Command: ${test.cmd}`);

      const result = await sandbox.commands.run(test.cmd);
      console.log("Exit code:", result.exitCode);
      console.log("Output:", result.stdout?.slice(0, 200) || "(empty)");

      if (result.exitCode !== 0) {
        console.log("Stderr:", result.stderr || "(empty)");
      }
      console.log("---\n");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (sandbox) {
      console.log("🧹 Cleaning up...");
      await sandbox.kill();
    }
  }
}

test().catch(console.error);