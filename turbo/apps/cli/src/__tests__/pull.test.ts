import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, readFile, rm } from "fs/promises";
import { readdirSync } from "fs";
import { mockServer } from "../test/mock-server";

// Import the pull command functions for direct testing
import { pullCommand, pullAllCommand } from "../commands/sync";

// Import config module with override capability
import { setOverrideConfig } from "../config";

describe("pull command", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "uspark-test-"));

    // Reset mock server state
    mockServer.reset();

    // Set up config override for testing
    setOverrideConfig({
      token: "test_token",
      apiUrl: "http://localhost:3000",
    });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });

    // Clear config override
    setOverrideConfig(null);
  });

  it("should pull a file from mock server to local filesystem", async () => {
    const projectId = "test-project";
    const filePath = "src/hello.ts";
    const fileContent = "export const greeting = 'Hello, World!';";

    // Setup mock server with test file
    mockServer.addFileToProject(projectId, filePath, fileContent);

    // Execute pull command with output directory
    await pullCommand(filePath, {
      projectId,
      outputDir: tempDir,
    });

    // Verify file was written to local filesystem with correct path
    const outputPath = join(tempDir, filePath);
    const pulledContent = await readFile(outputPath, "utf8");
    expect(pulledContent).toBe(fileContent);
  });

  it("should pull file to same path when no output specified", async () => {
    const projectId = "test-project-2";
    const filePath = "config/app.json";
    const fileContent = '{"name": "test-app", "version": "1.0.0"}';

    // Setup mock server
    mockServer.addFileToProject(projectId, filePath, fileContent);

    // Execute pull command without outputDir - should pull to current directory
    await pullCommand(filePath, {
      projectId,
    });

    // Verify file was written to current directory structure
    const pulledContent = await readFile(filePath, "utf8");
    expect(pulledContent).toBe(fileContent);
  });
});

describe("pull --all command", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "uspark-test-"));

    // Reset mock server state
    mockServer.reset();

    // Set up config override for testing
    setOverrideConfig({
      token: "test_token",
      apiUrl: "http://localhost:3000",
    });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });

    // Clear config override
    setOverrideConfig(null);
  });

  it("should pull all files from a project", async () => {
    const projectId = "multi-file-project";

    // Setup mock server with multiple test files
    const files = {
      "src/index.ts": "export const main = () => console.log('main');",
      "src/utils.ts": "export const helper = (x: number) => x * 2;",
      "config/app.json": '{"name": "test-app", "version": "1.0.0"}',
      "README.md": "# Test Project\n\nThis is a test project.",
    };

    Object.entries(files).forEach(([path, content]) => {
      mockServer.addFileToProject(projectId, path, content);
    });

    // Execute pull --all command
    await pullAllCommand({
      projectId,
      outputDir: tempDir,
    });

    // Verify all files were written to local filesystem
    for (const [filePath, expectedContent] of Object.entries(files)) {
      const outputPath = join(tempDir, filePath);
      const pulledContent = await readFile(outputPath, "utf8");
      expect(pulledContent).toBe(expectedContent);
    }
  });

  it("should handle empty project gracefully and create output directory", async () => {
    const projectId = "empty-project";
    const outputDir = join(tempDir, "empty-output");

    // Don't add any files to the project

    // Execute pull --all command - should not throw
    await pullAllCommand({
      projectId,
      outputDir,
    });

    // Verify directory was created even though no files were pulled
    const { statSync } = await import("fs");
    const stat = statSync(outputDir);
    expect(stat.isDirectory()).toBe(true);

    // Verify no files were created inside the directory
    const files = readdirSync(outputDir);
    expect(files).toHaveLength(0);
  });
});
