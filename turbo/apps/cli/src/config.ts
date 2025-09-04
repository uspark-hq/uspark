import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";

export interface CliConfig {
  token?: string;
  apiUrl?: string;
  user?: {
    id: string;
    email: string;
  };
}

const CONFIG_DIR = join(homedir(), ".uspark");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<CliConfig> {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  const content = await readFile(CONFIG_FILE, "utf8");
  return JSON.parse(content);
}

export async function saveConfig(config: CliConfig): Promise<void> {
  // Ensure config directory exists
  await mkdir(CONFIG_DIR, { recursive: true });

  // Merge with existing config
  const existing = await loadConfig();
  const merged = { ...existing, ...config };

  // Write config file
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf8");
}

export async function getToken(): Promise<string | undefined> {
  // Check environment variable first
  if (process.env.USPARK_TOKEN) {
    return process.env.USPARK_TOKEN;
  }
  
  const config = await loadConfig();
  return config.token;
}

export async function getApiUrl(): Promise<string> {
  const config = await loadConfig();
  return config.apiUrl || process.env.USPARK_API_URL || "https://app.uspark.com";
}

export async function clearConfig(): Promise<void> {
  if (existsSync(CONFIG_FILE)) {
    await unlink(CONFIG_FILE);
  }
}