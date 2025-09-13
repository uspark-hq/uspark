import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";

interface CliConfig {
  token?: string;
  apiUrl?: string;
  user?: {
    id: string;
    email: string;
  };
}

const CONFIG_DIR = join(homedir(), ".uspark");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

// Override configuration for testing
let overrideConfig: CliConfig | null = null;

export function setOverrideConfig(config: CliConfig | null): void {
  overrideConfig = config;
}

export async function loadConfig(): Promise<CliConfig> {
  if (overrideConfig !== null) {
    return overrideConfig;
  }
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  const content = await readFile(CONFIG_FILE, "utf8");
  return JSON.parse(content);
}

export async function saveConfig(config: CliConfig): Promise<void> {
  if (overrideConfig !== null) {
    // In test mode, just update the override
    overrideConfig = { ...overrideConfig, ...config };
    return;
  }

  // Ensure config directory exists
  await mkdir(CONFIG_DIR, { recursive: true });

  // Merge with existing config
  const existing = await loadConfig();
  const merged = { ...existing, ...config };

  // Write config file
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf8");
}

export async function getToken(): Promise<string | undefined> {
  // Check override first for testing
  if (overrideConfig !== null) {
    return overrideConfig.token || process.env.USPARK_TOKEN;
  }

  // Check environment variable first
  if (process.env.USPARK_TOKEN) {
    return process.env.USPARK_TOKEN;
  }

  const config = await loadConfig();
  return config.token;
}

export async function getApiUrl(): Promise<string> {
  if (overrideConfig !== null) {
    return (
      overrideConfig.apiUrl || process.env.USPARK_API_URL || "https://www.uspark.ai"
    );
  }

  const config = await loadConfig();
  // Support both API_HOST (preferred) and USPARK_API_URL (legacy)
  const apiHost = process.env.API_HOST || process.env.USPARK_API_URL;
  if (apiHost) {
    // Add protocol if missing
    return apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
  }
  return config.apiUrl || "https://www.uspark.ai";
}

export async function clearConfig(): Promise<void> {
  if (overrideConfig !== null) {
    overrideConfig = {};
    return;
  }

  if (existsSync(CONFIG_FILE)) {
    await unlink(CONFIG_FILE);
  }
}
