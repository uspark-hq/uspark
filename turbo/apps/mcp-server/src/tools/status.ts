import type { UsparkConfig } from "../config.js";

/**
 * Handle the uspark_status tool call
 * Returns current sync configuration and status
 */
export async function handleUsparkStatus(
  config: UsparkConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const status = [
    "uSpark MCP Server Status",
    "=========================",
    "",
    "Configuration:",
    `  Project ID: ${config.projectId}`,
    `  API URL: ${config.apiUrl}`,
    `  Output Directory: ${config.outputDir}`,
    `  Sync Interval: ${config.syncInterval}ms (${config.syncInterval / 1000 / 60} minutes)`,
    "",
    "Authentication: ✓ Configured",
    "",
    "Available Tools:",
    "  • uspark_pull - Pull files from remote project",
    "  • uspark_status - Show this status information",
    "  • uspark_list_files - List files in remote project",
  ].join("\n");

  return {
    content: [
      {
        type: "text",
        text: status,
      },
    ],
  };
}
