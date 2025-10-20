/**
 * Configuration for the uSpark MCP server
 * All configuration is read from environment variables
 */

export interface UsparkConfig {
  /** Authentication token for uSpark API */
  token: string;
  /** Project ID to sync */
  projectId: string;
  /** API URL (defaults to https://www.uspark.ai) */
  apiUrl: string;
  /** Sync interval in milliseconds (defaults to 1 hour) */
  syncInterval: number;
  /** Output directory for pulled files (defaults to .uspark) */
  outputDir: string;
}

/**
 * Load configuration from environment variables
 * @throws Error if required environment variables are missing
 */
export function loadConfig(): UsparkConfig {
  const token = process.env.USPARK_TOKEN;
  const projectId = process.env.USPARK_PROJECT_ID;

  // Validate required fields
  const missing: string[] = [];
  if (!token) missing.push("USPARK_TOKEN");
  if (!projectId) missing.push("USPARK_PROJECT_ID");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n\n` +
        `Please configure your MCP client with:\n` +
        `  USPARK_TOKEN: Your uSpark authentication token\n` +
        `  USPARK_PROJECT_ID: The project ID to sync\n` +
        `\n` +
        `Example configuration for Claude Desktop:\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "uspark": {\n` +
        `      "command": "npx",\n` +
        `      "args": ["-y", "@uspark/mcp-server"],\n` +
        `      "env": {\n` +
        `        "USPARK_TOKEN": "your-token",\n` +
        `        "USPARK_PROJECT_ID": "your-project-id"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`,
    );
  }

  return {
    token: token as string, // Already validated above
    projectId: projectId as string, // Already validated above
    apiUrl: process.env.USPARK_API_URL || "https://www.uspark.ai",
    syncInterval: parseInt(process.env.USPARK_SYNC_INTERVAL || "3600000", 10),
    outputDir: process.env.USPARK_OUTPUT_DIR || ".uspark",
  };
}
