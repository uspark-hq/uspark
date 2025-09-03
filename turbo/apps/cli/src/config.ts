import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

export interface CliConfig {
  token?: string;
  apiUrl?: string;
}

const CONFIG_DIR = join(homedir(), ".uspark");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<CliConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return {};
    }
    const content = await readFile(CONFIG_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load config:", error);
    return {};
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  try {
    // Ensure config directory exists
    await mkdir(CONFIG_DIR, { recursive: true });
    
    // Merge with existing config
    const existing = await loadConfig();
    const merged = { ...existing, ...config };
    
    // Write config file
    await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

export async function getToken(): Promise<string | undefined> {
  const config = await loadConfig();
  return config.token;
}

export async function getApiUrl(): Promise<string> {
  const config = await loadConfig();
  return config.apiUrl || process.env.USPARK_API_URL || "http://localhost:3000";
}

export async function clearConfig(): Promise<void> {
  try {
    if (existsSync(CONFIG_FILE)) {
      await writeFile(CONFIG_FILE, "{}", "utf8");
    }
  } catch (error) {
    console.error("Failed to clear config:", error);
  }
}