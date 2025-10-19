import type { UsparkConfig } from "../config.js";
import { ProjectSync } from "@uspark/core/yjs-filesystem/project-sync";

/**
 * Handle the uspark_list_files tool call
 * Lists all files in the remote project
 */
export async function handleUsparkListFiles(config: UsparkConfig): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    // Create ProjectSync instance
    const sync = new ProjectSync();

    // Use pullAll to sync the project (this loads all files into memory)
    // We use a temporary directory path, but we won't write files, just get the list
    await sync.syncFromRemote(config.projectId, {
      token: config.token,
      apiUrl: config.apiUrl,
      verbose: false,
    });

    // Get all files from the sync
    const files = sync.getAllFiles();

    if (files.size === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No files found in project ${config.projectId}`,
          },
        ],
      };
    }

    // Format file list
    const fileList = Array.from(files.keys())
      .sort()
      .map((path, index) => `${index + 1}. ${path}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Files in project ${config.projectId} (${files.size} total):\n\n${fileList}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Failed to list files: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
