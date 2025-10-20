import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, readFile, rm } from "fs/promises";
import { readdirSync } from "fs";
import { mockServer } from "../test/mock-server";

// Import the pull command functions for direct testing
import { pullCommand } from "../commands/sync";

// Import config module with override capability
import { setOverrideConfig } from "../config";
import { setOverrideProjectConfig } from "../project-config";

describe("pull command", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "uspark-test-"));

    // Change to temp directory for tests
    process.chdir(tempDir);

    // Reset mock server state
    mockServer.reset();

    // Set up config override for testing
    setOverrideConfig({
      token: "test_token",
      apiUrl: "http://localhost:3000",
    });

    // Set up project config override
    setOverrideProjectConfig({
      projectId: "test-project",
      version: "0",
    });
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });

    // Clear config overrides
    setOverrideConfig(null);
    setOverrideProjectConfig(null);
  });

  it("should pull all files from mock server to current directory", async () => {
    const projectId = "test-project";
    const files = {
      "src/hello.ts": "export const greeting = 'Hello, World!';",
      "config/app.json": '{"name": "test-app", "version": "1.0.0"}',
    };

    // Setup mock server with test files
    Object.entries(files).forEach(([path, content]) => {
      mockServer.addFileToProject(projectId, path, content);
    });

    // Execute pull command
    await pullCommand({});

    // Verify files were written to current directory
    for (const [filePath, expectedContent] of Object.entries(files)) {
      const pulledContent = await readFile(filePath, "utf8");
      expect(pulledContent).toBe(expectedContent);
    }
  });

  it("should pull files to current directory with nested structure", async () => {
    const projectId = "test-project";
    const files = {
      "src/index.ts": "export const main = () => console.log('main');",
      "src/utils.ts": "export const helper = (x: number) => x * 2;",
      "config/app.json": '{"name": "test-app", "version": "1.0.0"}',
      "README.md": "# Test Project\n\nThis is a test project.",
    };

    // Setup mock server with multiple test files
    Object.entries(files).forEach(([path, content]) => {
      mockServer.addFileToProject(projectId, path, content);
    });

    // Execute pull command
    await pullCommand({});

    // Verify all files were written to current directory
    for (const [filePath, expectedContent] of Object.entries(files)) {
      const pulledContent = await readFile(filePath, "utf8");
      expect(pulledContent).toBe(expectedContent);
    }
  });

  it("should use projectId from option if provided", async () => {
    const projectId = "different-project";
    const filePath = "test.txt";
    const fileContent = "test content";

    // Setup mock server with test file
    mockServer.addFileToProject(projectId, filePath, fileContent);

    // Execute pull command with explicit projectId
    await pullCommand({ projectId });

    // Verify file was pulled
    const pulledContent = await readFile(filePath, "utf8");
    expect(pulledContent).toBe(fileContent);
  });

  it("should handle empty project gracefully", async () => {
    const projectId = "empty-project";

    // Update project config to use empty project
    setOverrideProjectConfig({
      projectId,
      version: "0",
    });

    // Don't add any files to the project

    // Execute pull command - should not throw
    await pullCommand({});

    // Verify no files were created (directory should still be empty except for .config.json if created)
    const files = readdirSync(tempDir);
    expect(files.length).toBeLessThanOrEqual(1); // May contain .config.json from override
  });
});
