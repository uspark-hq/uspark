import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock("../logger", () => ({
  logger: {
    init: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  },
}));

import { loadConfig } from "../config";
import { logger } from "../logger";

describe("loadConfig", () => {
  const testDir = join(__dirname, "test-workspace");

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试目录
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should load config from .uspark.json", async () => {
    const config = {
      projectId: "test-project-123",
      version: "1",
    };

    writeFileSync(join(testDir, ".uspark.json"), JSON.stringify(config));

    const result = await loadConfig(testDir);

    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("test-project-123");
    expect(result?.version).toBe("1");
    expect(result?.configDir).toBe(testDir);

    // Verify logger was called with config discovery messages
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Looking for config files"),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Found config file"),
    );
  });

  it("should load config from .uspark/.config.json", async () => {
    const usparkDir = join(testDir, ".uspark");
    mkdirSync(usparkDir);

    const config = {
      projectId: "test-project-456",
      version: "2",
    };

    writeFileSync(join(usparkDir, ".config.json"), JSON.stringify(config));

    const result = await loadConfig(testDir);

    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("test-project-456");
    expect(result?.version).toBe("2");
    expect(result?.configDir).toBe(usparkDir);
  });

  it("should return null when no config file exists", async () => {
    const result = await loadConfig(testDir);

    expect(result).toBeNull();

    // Verify logger was called indicating no config found
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("No config file found"),
    );
  });

  it("should prefer .uspark.json over .uspark/.config.json", async () => {
    // 创建两个配置文件
    const usparkDir = join(testDir, ".uspark");
    mkdirSync(usparkDir);

    writeFileSync(
      join(testDir, ".uspark.json"),
      JSON.stringify({ projectId: "priority-project" }),
    );

    writeFileSync(
      join(usparkDir, ".config.json"),
      JSON.stringify({ projectId: "secondary-project" }),
    );

    const result = await loadConfig(testDir);

    expect(result).not.toBeNull();
    expect(result?.projectId).toBe("priority-project");
    expect(result?.configDir).toBe(testDir);
  });
});
