#!/usr/bin/env tsx

/**
 * Test script for E2B Claude integration
 * Tests creating a sandbox and executing Claude with a simple "hello" message
 */

import { Sandbox } from "e2b";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), ".env.local") });

const E2B_TEMPLATE_ID = "w6qe4mwx23icyuytq64y"; // uSpark Claude template

async function testE2BClaude() {
  console.log("🚀 Testing E2B Claude integration...");

  if (!process.env.E2B_API_KEY) {
    console.error("❌ E2B_API_KEY environment variable is required");
    console.log("Please add E2B_API_KEY to your .env.local file");
    process.exit(1);
  }

  let sandbox: Sandbox | undefined;

  try {
    // Check for Claude OAuth token first
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      console.error("❌ CLAUDE_CODE_OAUTH_TOKEN is required for Claude execution");
      console.log("Please add CLAUDE_CODE_OAUTH_TOKEN to your .env.local file");
      process.exit(1);
    }

    console.log("📦 Creating E2B sandbox with template:", E2B_TEMPLATE_ID);
    sandbox = await Sandbox.create(E2B_TEMPLATE_ID, {
      timeout: 300, // 5 minutes
      envs: {
        // Required environment variables
        PROJECT_ID: "test-project",
        USPARK_TOKEN: process.env.USPARK_TOKEN || "test-token",
        CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      },
    });

    console.log(`✅ Sandbox created with ID: ${sandbox.sandboxId}`);
    console.log("Sandbox object keys:", Object.keys(sandbox));
    console.log("Sandbox properties:", sandbox);

    // First, check what's in the container
    console.log("🔍 Checking container environment...");
    const lsOutput = await sandbox.commands.run("ls -la /");
    console.log("Root directory:", lsOutput.stdout || "empty");

    const nodeOutput = await sandbox.commands.run("which node");
    console.log("Node location:", nodeOutput.stdout || "not found");

    const npmOutput = await sandbox.commands.run("npm list -g --depth=0");
    console.log("Global npm packages:", npmOutput.stdout || "none");

    // Check if Claude CLI is installed
    console.log("🔍 Checking Claude CLI installation...");
    const claudeOutput = await sandbox.commands.run("claude --version");
    if (claudeOutput.exitCode !== 0) {
      console.error("❌ Claude CLI not found in container");
      console.error("stderr:", claudeOutput.stderr);
      return;
    }
    console.log("✅ Claude CLI found:", claudeOutput.stdout || "installed");

    // Check if uspark CLI is installed
    console.log("🔍 Checking uspark CLI installation...");
    const usparkOutput = await sandbox.commands.run("uspark --version");
    if (usparkOutput.exitCode !== 0) {
      console.error("❌ uspark CLI not found in container");
      console.error("stderr:", usparkOutput.stderr);
      return;
    }
    console.log("✅ uspark CLI found:", usparkOutput.stdout || "installed");

    // Test Claude execution with a simple prompt
    console.log("🤖 Testing Claude execution...");

    // First test with a simple echo to make sure commands work
    console.log("📝 Testing simple echo command...");
    const echoResult = await sandbox.commands.run('echo "Testing command execution"');
    console.log("Echo result:", echoResult.stdout);

    // Check environment variables
    console.log("🔍 Checking environment variables...");
    const envCheckResult = await sandbox.commands.run('env | grep CLAUDE');
    console.log("Claude env vars:", envCheckResult.stdout || "No CLAUDE env vars found");

    // Also check if token is set
    const tokenCheckResult = await sandbox.commands.run('if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then echo "Token is set (length: ${#CLAUDE_CODE_OAUTH_TOKEN})"; else echo "Token is NOT set"; fi');
    console.log("Token check:", tokenCheckResult.stdout);

    // Initialize Claude first by accepting terms
    console.log("\n🔧 Initializing Claude CLI...");
    const initResult = await sandbox.commands.run('echo "y" | timeout 5 claude --accept-tos 2>&1 || true');
    console.log("Init result:", initResult.stdout?.slice(0, 200) || "(empty)");

    // Create a temporary prompt file
    const prompt = "Hello! Please respond with a simple greeting.";
    await sandbox.files.write("/tmp/test_prompt.txt", prompt);

    // Check if the file was created
    const fileCheckResult = await sandbox.commands.run('cat /tmp/test_prompt.txt');
    console.log("Prompt file content:", fileCheckResult.stdout);

    // Try running Claude with explicit token and timeout
    console.log("📝 Executing Claude with prompt:", prompt);
    console.log("⏱️  Testing with timeout command to avoid hanging...");

    // Try different Claude invocation methods
    console.log("🔍 Testing different Claude invocation methods...");

    // Test 1: Check what happens when we run claude without any arguments
    console.log("Test 1: Running claude --help");
    const helpResult = await sandbox.commands.run('claude --help 2>&1 | head -10');
    console.log("Help output:", helpResult.stdout || "(empty)");

    // Test 2: Try with debug mode and capture all output
    console.log("\nTest 2: Running claude with debug mode");
    const debugResult = await sandbox.commands.run('timeout 10 claude --debug --print "Say hi" 2>&1');
    console.log("Debug - Exit code:", debugResult.exitCode);
    console.log("Debug - Full output:");
    console.log(debugResult.stdout || "(empty)");

    // Check the claude.json file after execution
    console.log("\nChecking ~/.claude.json content:");
    const claudeJsonResult = await sandbox.commands.run('cat ~/.claude.json 2>&1 | head -20');
    console.log("Claude JSON:", claudeJsonResult.stdout || "(empty)");

    // Test 3: Check network connectivity
    console.log("\nTest 3: Checking network connectivity");
    const curlResult = await sandbox.commands.run('curl -I https://api.anthropic.com 2>&1 | head -5');
    console.log("Curl test:", curlResult.stdout || "(empty)");

    // Test 4: Check if there's a proxy or network issue
    console.log("\nTest 4: Checking environment for proxy settings");
    const proxyCheckResult = await sandbox.commands.run('env | grep -i proxy');
    console.log("Proxy settings:", proxyCheckResult.stdout || "No proxy settings found");

    // Test 4: Check if there's a config issue
    const configCheckResult = await sandbox.commands.run('ls -la ~/.config/ 2>&1');
    console.log("Config directory:", configCheckResult.stdout?.slice(0, 300) || "(empty)");

    // Test 5: Try strace to see what Claude is doing
    const straceResult = await sandbox.commands.run('timeout 3 strace -e trace=open,read,write,connect claude -p /tmp/test_prompt.txt 2>&1 | head -50');
    console.log("Strace output (first 50 lines):");
    console.log(straceResult.stdout || "(empty)");

    // Now try the actual Claude execution
    const claudeResult = await sandbox.commands.run('claude -p /tmp/test_prompt.txt --output-format stream-json')

    console.log("🎯 Claude execution result:");
    console.log("Exit code:", claudeResult.exitCode);
    if (claudeResult.exitCode !== 0) {
      console.error("❌ Claude execution failed");
      console.error("stderr:", claudeResult.stderr);
    } else {
      console.log("✅ Claude execution successful!");
      console.log("stdout:", claudeResult.stdout);

      // Try to parse JSON output if present
      const output = claudeResult.stdout || "";
      if (output) {
        try {
          const lines = output.split('\n').filter(line => line.trim());
          console.log("📋 Parsed Claude responses:");
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                console.log("  -", parsed.type || "unknown", ":",
                          parsed.content || parsed.text || JSON.stringify(parsed));
              } catch {
                console.log("  - raw:", line);
              }
            }
          }
        } catch (error) {
          console.log("⚠️  Could not parse Claude output as JSON");
        }
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    if (sandbox) {
      console.log("🧹 Cleaning up sandbox...");
      try {
        await sandbox.kill();
        console.log("✅ Sandbox cleaned up");
      } catch (error) {
        console.error("⚠️  Failed to cleanup sandbox:", error);
      }
    }
  }
}

async function main() {
  try {
    await testE2BClaude();
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  }
}

// Run the main function
main();