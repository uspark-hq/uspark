import chalk from "chalk";
import { getToken, getApiUrl } from "../config";
import { ProjectSync } from "../project-sync";

export async function pullCommand(
  filePath: string,
  options: { projectId: string; output?: string },
): Promise<void> {
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();

  console.log(
    chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`),
  );

  const sync = new ProjectSync();
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
  // Check authentication
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();

  const sourcePath = options.source || filePath;
  console.log(
    chalk.blue(
      `Pushing ${sourcePath} to project ${options.projectId} as ${filePath}...`,
    ),
  );

  const sync = new ProjectSync();
  await sync.pushFile(options.projectId, filePath, options.source, {
    token,
    apiUrl,
  });

  console.log(chalk.green(`✓ Successfully pushed ${filePath}`));
}
