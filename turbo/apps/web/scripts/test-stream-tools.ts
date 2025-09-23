#!/usr/bin/env tsx

/**
 * Test stream JSON with tool usage
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y";

async function test() {
  console.log("🚀 Testing stream JSON with tool usage...");

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

    // A prompt that will trigger tool usage
    const prompt = "Create a file called test.txt with the content 'Hello World' and then read it back to confirm";

    console.log("📝 Running prompt that requires tools...");
    console.log(`Prompt: "${prompt}"\n`);

    const result = await sandbox.commands.run(
      `echo "${prompt}" | claude --print --verbose --output-format stream-json`
    );

    if (result.stdout) {
      const lines = result.stdout.split('\n').filter(line => line.trim());
      console.log(`Total JSON objects: ${lines.length}\n`);

      console.log("JSON objects in order:");
      lines.forEach((line, index) => {
        try {
          const parsed = JSON.parse(line);
          console.log(`\n[${index + 1}] Type: ${parsed.type}`);

          if (parsed.type === 'tool_use') {
            console.log(`    Tool: ${parsed.name}`);
            console.log(`    Input:`, JSON.stringify(parsed.input).slice(0, 100));
          } else if (parsed.type === 'tool_result') {
            console.log(`    Tool ID: ${parsed.tool_use_id}`);
            console.log(`    Success: ${!parsed.is_error}`);
            if (parsed.output) {
              console.log(`    Output:`, parsed.output.slice(0, 100));
            }
          } else if (parsed.type === 'assistant') {
            const content = parsed.message?.content?.[0];
            if (content?.type === 'text') {
              console.log(`    Text:`, content.text.slice(0, 200));
            } else if (content?.type === 'tool_use') {
              console.log(`    Tool call: ${content.name}`);
            }
          } else if (parsed.type === 'system') {
            console.log(`    Subtype: ${parsed.subtype}`);
          } else if (parsed.type === 'result') {
            console.log(`    Success: ${!parsed.is_error}`);
            console.log(`    Result:`, parsed.result?.slice(0, 200));
          }
        } catch (e) {
          console.log(`[${index + 1}] Failed to parse:`, line.slice(0, 100));
        }
      });
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