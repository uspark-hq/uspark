import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

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

  for (const configPath of paths) {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf8");
      const config = JSON.parse(content);
      return {
        projectId: config.projectId,
        version: config.version,
        configDir: dirname(configPath),
      };
    }
  }

  return null;
}
