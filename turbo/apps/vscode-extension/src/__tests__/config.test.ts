import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { loadConfig } from "../config";

describe("loadConfig", () => {
  const testDir = join(__dirname, "test-workspace");

  beforeEach(() => {
    // 清理测试目录
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
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
