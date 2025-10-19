import chalk from "chalk";
import { getToken, getApiUrl } from "../config";
import { ProjectSync } from "../project-sync";
import { readdir } from "fs/promises";
import { join } from "path";

interface AuthenticatedContext {
  token: string;
  apiUrl: string;
  sync: ProjectSync;
}

export async function requireAuth(): Promise<AuthenticatedContext> {
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();
  const sync = new ProjectSync();

  return { token, apiUrl, sync };
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip common directories to exclude
    if (entry.isDirectory()) {
      if (
        ["node_modules", ".git", ".next", "dist", ".turbo"].includes(entry.name)
      ) {
        continue;
      }
      files.push(...(await getAllFiles(fullPath)));
    } else {
      // Skip system files
      if (entry.name === ".DS_Store") {
        continue;
      }

      // Get relative path from current directory
      const relativePath = fullPath.startsWith("./")
        ? fullPath.slice(2)
        : fullPath;
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Push all files from a directory to the remote project
 * @param context Authenticated context
 * @param projectId Project ID
 * @param directory Directory to push files from
 * @param prefix Optional prefix to strip from remote file paths
 */
export async function pushAllFiles(
  context: AuthenticatedContext,
  projectId: string,
  directory: string,
  prefix?: string,
): Promise<number> {
  const files = await getAllFiles(directory);

  if (files.length === 0) {
    return 0;
  }

  // Convert to format expected by pushFiles
  const filesToPush = files.map((localPath) => {
    let remotePath = localPath;

    // If prefix is specified, strip it from the remote path
    if (prefix) {
      const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");

      if (localPath.startsWith(normalizedPrefix + "/")) {
        remotePath = localPath.substring(normalizedPrefix.length + 1);
      } else if (localPath === normalizedPrefix) {
        remotePath = "";
      }
    }

    return {
      filePath: remotePath,
      localPath: localPath,
    };
  });

  // Use batch push with fail-fast
  await context.sync.pushFiles(projectId, filesToPush, {
    token: context.token,
    apiUrl: context.apiUrl,
  });

  return files.length;
}
