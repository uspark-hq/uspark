import chalk from "chalk";
import { requireAuth } from "./shared";

export async function pullCommand(
  filePath: string,
  options: { projectId: string; output?: string },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  console.log(
    chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`),
  );

  await sync.pullFile(options.projectId, filePath, {
    token,
    apiUrl,
  }, options.output);

  const outputPath = options.output || filePath;
  console.log(chalk.green(`✓ Successfully pulled to ${outputPath}`));
}

export async function pushCommand(
  filePath: string | undefined,
  options: { projectId: string; all?: boolean },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  // Handle --all flag for batch push
  if (options.all) {
    console.log(
      chalk.blue(`Pushing all files to project ${options.projectId}...`),
    );

    // Get all files in current directory recursively
    const { readdir } = await import("fs/promises");
    const { join } = await import("path");

    const getAllFiles = async (dir: string): Promise<string[]> => {
      const files: string[] = [];
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip common directories to exclude
        if (entry.isDirectory()) {
          if (
            ["node_modules", ".git", ".next", "dist", ".turbo"].includes(
              entry.name,
            )
          ) {
            continue;
          }
          files.push(...(await getAllFiles(fullPath)));
        } else {
          // Get relative path from current directory
          const relativePath = fullPath.startsWith("./")
            ? fullPath.slice(2)
            : fullPath;
          files.push(relativePath);
        }
      }

      return files;
    };

    const files = await getAllFiles(".");

    if (files.length === 0) {
      console.log(chalk.yellow("No files found to push"));
      return;
    }

    console.log(chalk.blue(`Found ${files.length} files to push`));

    // Convert to format expected by pushFiles
    const filesToPush = files.map((filePath) => ({
      filePath,
      localPath: filePath,
    }));

    // Use batch push with fail-fast - all files in one operation
    // This will throw on first error, ensuring atomic operation
    await sync.pushFiles(options.projectId, filesToPush, {
      token,
      apiUrl,
    });

    console.log(chalk.green(`✓ Successfully pushed ${files.length} files`));
    return;
  }

  // Single file push
  if (!filePath) {
    throw new Error("File path is required");
  }

  console.log(
    chalk.blue(`Pushing ${filePath} to project ${options.projectId}...`),
  );

  await sync.pushFile(options.projectId, filePath, {
    token,
    apiUrl,
  }, filePath);

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}
