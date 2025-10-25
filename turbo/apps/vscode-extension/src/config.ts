import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { logger } from "./logger";

interface Config {
  projectId: string;
  version?: string;
  configDir: string;
}

export async function loadConfig(
  workspaceRoot: string,
): Promise<Config | null> {
  const paths = [
    join(workspaceRoot, ".uspark.json"),
    join(workspaceRoot, ".uspark", ".config.json"),
  ];

  logger.info(`Looking for config files in: ${workspaceRoot}`);

  for (const configPath of paths) {
    logger.info(`Checking: ${configPath}`);
    if (existsSync(configPath)) {
      logger.info(`Found config file: ${configPath}`);
      const content = readFileSync(configPath, "utf8");
      const config = JSON.parse(content);
      return {
        projectId: config.projectId,
        version: config.version,
        configDir: dirname(configPath),
      };
    }
  }

  logger.info("No config file found in any of the checked paths");
  return null;
}
