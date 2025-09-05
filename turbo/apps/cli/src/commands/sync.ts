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

  await sync.pullFile(options.projectId, filePath, options.output, {
    token,
    apiUrl,
  });

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
          if (["node_modules", ".git", ".next", "dist", ".turbo"].includes(entry.name)) {
            continue;
          }
          files.push(...await getAllFiles(fullPath));
        } else {
          // Get relative path from current directory
          const relativePath = fullPath.startsWith("./") ? fullPath.slice(2) : fullPath;
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
    const filesToPush = files.map(filePath => ({
      filePath,
      localPath: filePath,
    }));

    let successCount = 0;
    let failCount = 0;

    // Process files one by one to show progress
    for (const file of filesToPush) {
      try {
        console.log(chalk.gray(`  Pushing ${file.filePath}...`));
        await sync.pushFile(options.projectId, file.filePath, file.localPath, {
          token,
          apiUrl,
        });
        successCount++;
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to push ${file.filePath}: ${error}`));
        failCount++;
      }
    }

    console.log(
      chalk.green(
        `✓ Push complete: ${successCount} succeeded, ${failCount} failed`,
      ),
    );
    return;
  }

  // Single file push
  if (!filePath) {
    throw new Error("File path is required");
  }

  console.log(
    chalk.blue(`Pushing ${filePath} to project ${options.projectId}...`),
  );

  await sync.pushFile(options.projectId, filePath, filePath, {
    token,
    apiUrl,
  });

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}
