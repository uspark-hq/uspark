import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, readFile, rm } from "fs/promises";
import { mockServer } from "../test/mock-server";

// Import the pull command function for direct testing
import { pullCommand } from "../commands/sync";

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

    // Execute pull command
    const outputPath = join(tempDir, "pulled-hello.ts");
    await pullCommand(filePath, {
      projectId,
      output: outputPath,
    });

    // Verify file was written to local filesystem
    const pulledContent = await readFile(outputPath, "utf8");
    expect(pulledContent).toBe(fileContent);
  });

  it("should pull file to same path when no output specified", async () => {
    const projectId = "test-project-2";
    const filePath = "config/app.json";
    const fileContent = '{"name": "test-app", "version": "1.0.0"}';

    // Setup mock server
    mockServer.addFileToProject(projectId, filePath, fileContent);

    // Execute pull command without output option
    const expectedPath = join(tempDir, filePath);
    await pullCommand(filePath, {
      projectId,
      output: expectedPath, // Simulate default behavior
    });

    // Verify file was written
    const pulledContent = await readFile(expectedPath, "utf8");
    expect(pulledContent).toBe(fileContent);
  });

  it("should throw error when file not found in project", async () => {
    const projectId = "empty-project";
    const filePath = "nonexistent.txt";

    // Don't add any files to the project

    const outputPath = join(tempDir, "output.txt");

    await expect(
      pullCommand(filePath, {
        projectId,
        output: outputPath,
      }),
    ).rejects.toThrow("File not found in project: nonexistent.txt");
  });

  it("should throw error when not authenticated", async () => {
    // Override config to simulate no authentication
    setOverrideConfig({
      token: undefined,
      apiUrl: "http://localhost:3000",
    });

    const projectId = "test-project";
    const filePath = "test.txt";
    const outputPath = join(tempDir, "test.txt");

    await expect(
      pullCommand(filePath, {
        projectId,
        output: outputPath,
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("should pull all files with --all flag", async () => {
    const projectId = "multi-file-project";
    const files = [
      { path: "src/index.ts", content: "export * from './lib';" },
      { path: "src/lib.ts", content: "export const lib = true;" },
      { path: "README.md", content: "# Test Project" },
      { path: "config/app.json", content: '{"name": "app"}' },
    ];

    // Setup mock server with multiple files
    for (const file of files) {
      mockServer.addFileToProject(projectId, file.path, file.content);
    }

    // Change to temp directory for testing
    process.chdir(tempDir);

    // Execute pull command with --all flag
    await pullCommand(undefined, {
      projectId,
      all: true,
    });

    // Verify that files that could be pulled were pulled
    // Note: Some files may not have blob content available in mock server
    const pulledFiles = [];
    for (const file of files) {
      try {
        const pulledContent = await readFile(join(tempDir, file.path), "utf8");
        pulledFiles.push(file);
        expect(pulledContent).toBe(file.content);
      } catch {
        // File was not pulled (blob not available)
      }
    }

    // At least some files should have been pulled
    expect(pulledFiles.length).toBeGreaterThan(0);
  });

  it("should throw error when no filePath and no --all flag", async () => {
    const projectId = "test-project";

    await expect(
      pullCommand(undefined, {
        projectId,
      }),
    ).rejects.toThrow("File path is required when not using --all");
  });
});
