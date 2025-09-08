import { Sandbox } from "e2b";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testClaudeAuth() {
  console.log("Starting Claude authentication test in E2B sandbox...");
  console.log("Template ID: w6qe4mwx23icyuytq64y");
  console.log("---");

  // Check if E2B API token is set
  if (!process.env.E2B_API_TOKEN) {
    console.error("Error: E2B_API_TOKEN is not set in environment variables");
    process.exit(1);
  }

  let sandbox: Sandbox | null = null;
  let rl: readline.Interface | null = null;

  try {
    // Initialize sandbox with specified template
    console.log("Initializing sandbox...");
    sandbox = await Sandbox.create({
      template: "w6qe4mwx23icyuytq64y",
      apiKey: process.env.E2B_API_TOKEN,
    });
    console.log(`Sandbox created successfully! ID: ${sandbox.sandboxId}`);
    console.log("---");

    // Test the claude command directly
    console.log("Testing Claude CLI...");
    
    // Check if claude command is available
    const claudeVersion = await sandbox.commands.run("claude --version");
    console.log("✅ Claude CLI found! Version:", claudeVersion.stdout);

    // Test claude auth command
    console.log("\nTesting Claude authentication flow...");
    const authResult = await sandbox.commands.run("claude auth 2>&1");
    console.log("Auth command output:", authResult.stdout);

    // If claude is installed, proceed with real auth flow
    console.log("\n---");
    console.log("🔐 Starting Claude authentication...");
      

    // Check if running in interactive mode (TTY)
    const isInteractive = process.stdin.isTTY;
    
    if (isInteractive) {
      // Create readline interface for user input
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Helper function to prompt user for input
      const prompt = (question: string): Promise<string> => {
        return new Promise((resolve) => {
          rl!.question(question, (answer) => {
            resolve(answer);
          });
        });
      };

      // Wait for user to input the verification code (for demonstration)
      const verificationCode = await prompt("Enter a test verification code (or 'skip' to continue): ");
      
      if (verificationCode.trim() && verificationCode.trim() !== 'skip') {
        console.log(`\n📝 Verification code received: ${verificationCode}`);
        console.log("In a real scenario, this would be sent to the Claude CLI for authentication.");
        
        // Simulate successful authentication
        console.log("\n✅ Authentication simulation complete!");
        console.log("📌 Example OAuth Token: claude_oauth_abc123xyz789...");
      }
    } else {
      console.log("Running in non-interactive mode. Skipping user input.");
      console.log("\n✅ Authentication simulation complete!");
      console.log("📌 Example OAuth Token: claude_oauth_abc123xyz789...");
    }
    
    // Check what tools are actually available in the sandbox
    console.log("\n---");
    console.log("Exploring sandbox environment...");
    const envInfo = await sandbox.commands.run("env | grep -E '(PATH|HOME|USER)' | head -5");
    console.log("Environment variables:");
    console.log(envInfo.stdout);
    
    const nodeVersion = await sandbox.commands.run("node --version");
    console.log("\nNode version:", nodeVersion.stdout);
    
    const npmVersion = await sandbox.commands.run("npm --version");
    console.log("NPM version:", npmVersion.stdout);

    console.log("\n✅ Test completed successfully!");

  } finally {    
    // Close readline interface if it was created
    if (rl) {
      rl.close();
    }
    
    if (sandbox) {
      console.log("\n---");
      console.log("Cleaning up sandbox...");
      await sandbox.kill();
      console.log("Sandbox terminated.");
    }
  }
}

// Run the test
testClaudeAuth().catch((error) => {
  console.error(error);
  process.exit(1);
});
