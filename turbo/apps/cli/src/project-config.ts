import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

interface ProjectConfig {
  projectId: string;
  version?: string;
  workerId?: string;
}

const CONFIG_FILENAME = ".config.json";

// Override configuration for testing
let overrideConfig: ProjectConfig | null = null;

export function setOverrideProjectConfig(config: ProjectConfig | null): void {
  overrideConfig = config;
}

export async function loadProjectConfig(
  dir: string = process.cwd(),
): Promise<ProjectConfig | null> {
  if (overrideConfig !== null) {
    return overrideConfig;
  }

  const configPath = join(dir, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return null;
  }

  const content = await readFile(configPath, "utf8");
  return JSON.parse(content);
}

export async function saveProjectConfig(
  config: ProjectConfig,
  dir: string = process.cwd(),
): Promise<void> {
  if (overrideConfig !== null) {
    // In test mode, just update the override
    overrideConfig = { ...overrideConfig, ...config };
    return;
  }

  const configPath = join(dir, CONFIG_FILENAME);

  // Merge with existing config if it exists
  const existing = await loadProjectConfig(dir);
  const merged = existing ? { ...existing, ...config } : config;

  // Write config file
  await writeFile(configPath, JSON.stringify(merged, null, 2), "utf8");
}

export async function getProjectId(
  dir: string = process.cwd(),
): Promise<string | undefined> {
  const config = await loadProjectConfig(dir);
  return config?.projectId;
}

export async function getProjectVersion(
  dir: string = process.cwd(),
): Promise<string | undefined> {
  const config = await loadProjectConfig(dir);
  return config?.version;
}

export async function updateProjectVersion(
  version: string,
  dir: string = process.cwd(),
): Promise<void> {
  const config = await loadProjectConfig(dir);
  if (!config) {
    throw new Error(
      `No project config found at ${dir}. Project config should be initialized automatically on first push/pull.`,
    );
  }
  await saveProjectConfig({ ...config, version }, dir);
}

export async function getOrCreateWorkerId(
  dir: string = process.cwd(),
): Promise<string> {
  const config = await loadProjectConfig(dir);

  // If config doesn't exist or doesn't have a workerId, generate a new one
  if (!config?.workerId) {
    const workerId = randomUUID();
    await saveProjectConfig(
      { ...(config || {}), workerId } as ProjectConfig,
      dir,
    );
    return workerId;
  }

  return config.workerId;
}
