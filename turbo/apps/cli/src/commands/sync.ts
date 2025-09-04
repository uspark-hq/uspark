import chalk from "chalk";
import { requireAuth } from "./shared";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

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
  options: { projectId: string; source?: string; all?: boolean },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  // Handle --all flag for batch push
  if (options.all) {
    console.log(
      chalk.blue(`Pushing all files to project ${options.projectId}...`),
    );
    
    const files = await getAllFiles(".");
    let successCount = 0;
    let failedCount = 0;
    
    for (const file of files) {
      try {
        await sync.pushFile(options.projectId, file, file, {
          token,
          apiUrl,
        });
        console.log(chalk.green(`  ✓ Pushed ${file}`));
        successCount++;
      } catch (error) {
        console.log(chalk.yellow(`  ✗ Failed to push ${file}: ${error instanceof Error ? error.message : error}`));
        failedCount++;
      }
    }
    
    console.log(
      chalk.green(
        `\n✓ Push completed: ${successCount} succeeded, ${failedCount} failed`,
      ),
    );
    return;
  }

  // Single file push
  if (!filePath) {
    throw new Error("File path is required when not using --all flag");
  }

  const sourcePath = options.source || filePath;
  console.log(
    chalk.blue(
      `Pushing ${sourcePath} to project ${options.projectId} as ${filePath}...`,
    ),
  );

  await sync.pushFile(options.projectId, filePath, options.source, {
    token,
    apiUrl,
  });

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir);
    
    for (const entry of entries) {
      // Skip common directories that shouldn't be synced
      if (entry === "node_modules" || entry === ".git" || entry === ".next") {
        continue;
      }
      
      const fullPath = join(currentDir, entry);
      const fileStat = await stat(fullPath);
      
      if (fileStat.isDirectory()) {
        await traverse(fullPath);
      } else {
        // Get relative path from root directory
        const relativePath = relative(".", fullPath);
        files.push(relativePath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}
