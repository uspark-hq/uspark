import type { UsparkConfig } from "../config.js";
import { ProjectSync } from "@uspark/core/yjs-filesystem";

/**
 * Handle the uspark_pull tool call
 * Pulls all files from the configured project to the local output directory
 */
export async function handleUsparkPull(config: UsparkConfig): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    // Create ProjectSync instance
    const sync = new ProjectSync();

    // Pull all files from the project
    await sync.pullAll(
      config.projectId,
      {
        token: config.token,
        apiUrl: config.apiUrl,
        verbose: false, // Silent mode for MCP
      },
      config.outputDir,
    );

    // Get file count
    const files = sync.getAllFiles();
    const fileCount = files.size;

    return {
      content: [
        {
          type: "text",
          text: `Successfully pulled ${fileCount} file${fileCount !== 1 ? "s" : ""} from project ${config.projectId} to ${config.outputDir}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Failed to pull project: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
