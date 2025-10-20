import chalk from "chalk";
import { requireAuth, pushAllFiles } from "./shared";
import { join } from "path";

export async function pullCommand(
  filePath: string,
  options: { projectId: string; outputDir?: string; verbose?: boolean },
): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  console.log(
    chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`),
  );

  await sync.pullFile(
    options.projectId,
    filePath,
    {
      token,
      apiUrl,
      verbose: options.verbose,
    },
    options.outputDir,
  );

  const outputPath = options.outputDir
    ? join(options.outputDir, filePath)
    : filePath;
  console.log(chalk.green(`✓ Successfully pulled to ${outputPath}`));
}

export async function pullAllCommand(options: {
  projectId: string;
  outputDir?: string;
  verbose?: boolean;
  prefix?: string;
}): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  await sync.pullAll(
    options.projectId,
    {
      token,
      apiUrl,
      verbose: options.verbose,
    },
    options.outputDir,
    options.prefix,
  );
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

    const count = await pushAllFiles(
      { token, apiUrl, sync },
      options.projectId,
      ".",
    );

    if (count === 0) {
      console.log(chalk.yellow("No files found to push"));
      return;
    }

    console.log(chalk.green(`✓ Successfully pushed ${count} files`));
    return;
  }

  // Single file push
  if (!filePath) {
    throw new Error("File path is required");
  }

  console.log(
    chalk.blue(`Pushing ${filePath} to project ${options.projectId}...`),
  );

  await sync.pushFile(
    options.projectId,
    filePath,
    {
      token,
      apiUrl,
    },
    filePath,
  );

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}
