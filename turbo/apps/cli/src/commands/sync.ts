import chalk from "chalk";
import { requireAuth } from "./shared";

export async function pullCommand(
  filePath: string | undefined,
  options: { projectId: string; output?: string; all?: boolean },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  // Handle --all flag for batch pull
  if (options.all) {
    console.log(
      chalk.blue(`Pulling all files from project ${options.projectId}...`),
    );

    // Pull all files from the project
    const fileCount = await sync.pullAllFiles(options.projectId, {
      token,
      apiUrl,
    });

    console.log(chalk.green(`✓ Successfully pulled ${fileCount} files`));
    return;
  }

  // Single file pull
  if (!filePath) {
    throw new Error("File path is required when not using --all");
  }

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
  filePath: string,
  options: { projectId: string; source?: string },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

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
