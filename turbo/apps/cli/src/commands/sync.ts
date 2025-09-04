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
    throw new Error(
      "--all flag is not supported yet. Please specify individual files.",
    );
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
