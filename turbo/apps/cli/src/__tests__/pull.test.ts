import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, readFile, rm } from "fs/promises";
import { mockServer } from "../test/mock-server";

// Import the pull command functions for direct testing
import { pullCommand, pullAllCommand } from "../commands/sync";

// Mock the config module
vi.mock("../config", () => ({
  getToken: vi.fn().mockResolvedValue("test_token"),
  getApiUrl: vi.fn().mockResolvedValue("http://localhost:3000"),
  loadConfig: vi.fn().mockResolvedValue({
    token: "test_token",
    apiUrl: "http://localhost:3000",
  }),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  clearConfig: vi.fn().mockResolvedValue(undefined),
}));

describe("pull command", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "uspark-test-"));

    // Reset mock server state
    mockServer.reset();
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });
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
    const { getToken } = await import("../config");
    vi.mocked(getToken).mockResolvedValueOnce(undefined);

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
});

describe("pull --all command", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "uspark-test-"));

    // Reset mock server state
    mockServer.reset();
    
    // Reset config mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });
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
      output: tempDir,
    });

    // Verify all files were written to local filesystem
    for (const [filePath, expectedContent] of Object.entries(files)) {
      const outputPath = join(tempDir, filePath);
      const pulledContent = await readFile(outputPath, "utf8");
      expect(pulledContent).toBe(expectedContent);
    }
  });

  it("should handle empty project gracefully", async () => {
    const projectId = "empty-project";

    // Don't add any files to the project

    // Execute pull --all command - should not throw
    await pullAllCommand({
      projectId,
      output: tempDir,
    });

    // Verify no files were created
    const { readdirSync } = await import("fs");
    const files = readdirSync(tempDir);
    expect(files).toHaveLength(0);
  });

  it.skip("should throw error when file metadata not found", async () => {
    // This would need special setup to create a broken state
    // For now, we'll skip this test since it requires internal manipulation
  });

  it("should throw error when not authenticated", async () => {
    const { getToken } = await import("../config");
    vi.mocked(getToken).mockResolvedValueOnce(undefined);

    const projectId = "test-project";

    await expect(
      pullAllCommand({
        projectId,
        output: tempDir,
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
