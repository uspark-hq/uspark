import chalk from "chalk";
import { requireAuth, pushAllFiles } from "./shared";
import {
  getProjectId,
  updateProjectVersion,
  getProjectVersion,
  saveProjectConfig,
  loadProjectConfig,
} from "../project-config";

export async function pullCommand(options: {
  projectId?: string;
  verbose?: boolean;
}): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  const projectId = options.projectId || (await getProjectId());

  if (!projectId) {
    console.error(
      chalk.red(
        "Error: No project ID found. Please provide --project-id on first run.",
      ),
    );
    process.exit(1);
  }

  const existingConfig = await loadProjectConfig();
  if (!existingConfig) {
    await saveProjectConfig({
      projectId,
      version: "0",
    });
    console.log(chalk.gray(`  Initialized project config: .config.json`));
  }

  console.log(chalk.blue(`Pulling all files from project ${projectId}...`));

  await sync.pullAll(
    projectId,
    {
      token,
      apiUrl,
      verbose: options.verbose,
    },
    ".", // Always pull to current directory
  );

  console.log(
    chalk.green(`✓ Successfully pulled all files to current directory`),
  );
}

export async function pushCommand(options: {
  projectId?: string;
}): Promise<void> {
  const { token, apiUrl, sync } = await requireAuth();

  const projectId = options.projectId || (await getProjectId());

  if (!projectId) {
    console.error(
      chalk.red(
        "Error: No project ID found. Please provide --project-id on first run.",
      ),
    );
    process.exit(1);
  }

  const existingConfig = await loadProjectConfig();
  if (!existingConfig) {
    await saveProjectConfig({
      projectId,
      version: "0",
    });
    console.log(chalk.gray(`  Initialized project config: .config.json`));
  }

  console.log(chalk.blue(`Pushing all files to project ${projectId}...`));

  const changedCount = await pushAllFiles(
    { token, apiUrl, sync },
    projectId,
    ".", // Always push from current directory
  );

  if (changedCount === 0) {
    console.log(chalk.gray("No changes to push (all files are up to date)"));
    return;
  }

  const currentVersion = await getProjectVersion();
  const newVersion = currentVersion ? String(Number(currentVersion) + 1) : "1";
  await updateProjectVersion(newVersion);

  console.log(
    chalk.green(
      `✓ Successfully pushed ${changedCount} files (version ${newVersion})`,
    ),
  );
}
