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
  options: { projectId: string; all?: boolean },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  // Handle --all flag for batch push
  if (options.all) {
    console.log(
      chalk.blue(`Pushing all files to project ${options.projectId}...`),
    );
    
    const filePaths = await getAllFiles(".");
    
    // Prepare file list for batch push
    const files = filePaths.map(path => ({ filePath: path }));
    
    // Batch push all files in one PATCH request
    await sync.pushFiles(options.projectId, files, { token, apiUrl });
    
    console.log(
      chalk.green(`✓ Push completed: ${files.length} files pushed`),
    );
    return;
  }

  // Single file push
  if (!filePath) {
    throw new Error("File path is required when not using --all flag");
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

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir);
    
    for (const entry of entries) {
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
