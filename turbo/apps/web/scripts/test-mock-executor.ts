#!/usr/bin/env tsx
/**
 * Test script for Mock Claude Executor
 * Usage: pnpm tsx scripts/test-mock-executor.ts
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface TurnResponse {
  id: string;
  session_id: string;
  user_message: string;
  status: string;
  created_at: string;
  is_mock?: boolean;
}

interface Block {
  id: string;
  type: string;
  content: any;
  sequence_number: number;
}

interface TurnWithBlocks {
  id: string;
  user_prompt: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  blocks: Block[];
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createMockTurn(
  projectId: string,
  sessionId: string,
  userMessage: string,
  token: string,
): Promise<TurnResponse> {
  const response = await fetch(
    `${API_URL}/api/projects/${projectId}/sessions/${sessionId}/mock-execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_message: userMessage }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create mock turn: ${error}`);
  }

  return response.json();
}

async function getTurnStatus(
  projectId: string,
  sessionId: string,
  turnId: string,
  token: string,
): Promise<TurnWithBlocks> {
  const response = await fetch(
    `${API_URL}/api/projects/${projectId}/sessions/${sessionId}/turns/${turnId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get turn status: ${error}`);
  }

  return response.json();
}

async function testMockExecutor() {
  console.log("🧪 Testing Mock Claude Executor\n");
  console.log("=" .repeat(50));

  // Test configuration
  const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || "test-token";
  const PROJECT_ID = process.env.TEST_PROJECT_ID || "proj_test123";
  const SESSION_ID = process.env.TEST_SESSION_ID || "sess_test123";

  console.log("Configuration:");
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Project ID: ${PROJECT_ID}`);
  console.log(`  Session ID: ${SESSION_ID}\n`);

  // Test cases
  const testCases = [
    { message: "Hello Claude!", description: "Greeting test" },
    { message: "Read the README file", description: "File operation test" },
    { message: "Write some code for me", description: "Code generation test" },
    { message: "I found an error in my code", description: "Debugging test" },
    { message: "Analyze my project structure", description: "General request test" },
  ];

  for (const testCase of testCases) {
    console.log("-".repeat(50));
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Message: "${testCase.message}"`);

    try {
      // Create mock turn
      console.log("\n   Creating turn...");
      const turn = await createMockTurn(
        PROJECT_ID,
        SESSION_ID,
        testCase.message,
        TEST_TOKEN,
      );

      console.log(`   ✅ Turn created: ${turn.id}`);
      console.log(`   📊 Initial status: ${turn.status}`);
      console.log(`   🎭 Is mock: ${turn.is_mock ? "Yes" : "No"}`);

      // Poll for completion
      console.log("\n   Monitoring execution:");
      let lastBlockCount = 0;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (attempts < maxAttempts) {
        await delay(1000); // Poll every second

        const turnStatus = await getTurnStatus(
          PROJECT_ID,
          SESSION_ID,
          turn.id,
          TEST_TOKEN,
        );

        // Show new blocks as they arrive
        if (turnStatus.blocks && turnStatus.blocks.length > lastBlockCount) {
          for (let i = lastBlockCount; i < turnStatus.blocks.length; i++) {
            const block = turnStatus.blocks[i];
            console.log(`     [${block.type}] Block #${i + 1} created`);

            // Show block content preview
            if (block.type === "thinking" && block.content?.text) {
              console.log(`       💭 "${block.content.text.substring(0, 50)}..."`);
            } else if (block.type === "content" && block.content?.text) {
              console.log(`       💬 "${block.content.text.substring(0, 50)}..."`);
            } else if (block.type === "tool_use") {
              console.log(`       🔧 Tool: ${block.content?.tool_name}`);
            }
          }
          lastBlockCount = turnStatus.blocks.length;
        }

        // Check if completed
        if (turnStatus.status === "completed") {
          console.log(`\n   ✅ Turn completed successfully!`);
          console.log(`   📦 Total blocks: ${turnStatus.blocks.length}`);
          break;
        } else if (turnStatus.status === "failed") {
          console.log(`\n   ❌ Turn failed!`);
          break;
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.log(`\n   ⏱️ Timeout waiting for completion`);
      }
    } catch (error) {
      console.error(`\n   ❌ Error: ${error}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ Mock executor testing complete!\n");
}

// Run the test
testMockExecutor().catch(console.error);