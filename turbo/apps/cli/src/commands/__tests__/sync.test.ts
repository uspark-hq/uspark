import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushCommand, pullCommand } from "../sync";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { http, HttpResponse } from "msw";
import { mockServer } from "../../test/mock-server";
import { server } from "../../test/setup";

describe("sync commands", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for real file system operations
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "uspark-test-"));
    process.chdir(tempDir);

    // Set environment variables for authentication
    process.env.USPARK_TOKEN = "test-token";
    process.env.USPARK_API_URL = "http://localhost:3000";

    // Reset mock server
    mockServer.reset();

    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Clean up environment variables
    delete process.env.USPARK_TOKEN;
    delete process.env.USPARK_API_URL;

    vi.restoreAllMocks();
  });

  describe("pushCommand", () => {
    it("should push a single file successfully", async () => {
      // Create a test file
      await fs.writeFile("test.txt", "test content");

      await pushCommand("test.txt", { projectId: "proj-123" });

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pushed test.txt"),
      );
    });

    it("should actually update the YDoc with pushed files", async () => {
      // Create test files
      await fs.writeFile("file1.txt", "content1");
      await fs.mkdir("dir", { recursive: true });
      await fs.writeFile("dir/file2.txt", "content2");

      // Push the first file
      await pushCommand("file1.txt", { projectId: "proj-123" });

      // Verify the file is in the YDoc
      expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "dir/file2.txt")).toBe(false);

      // Push the second file
      await pushCommand("dir/file2.txt", { projectId: "proj-123" });

      // Verify both files are now in the YDoc
      expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "dir/file2.txt")).toBe(true);

      // Verify the YDoc structure
      const projectDoc = mockServer.getProjectDoc("proj-123");
      expect(projectDoc).toBeDefined();

      const files = projectDoc?.getMap("files");
      expect(files?.size).toBe(2);

      const file1Node = files?.get("file1.txt") as { hash: string };
      expect(file1Node).toBeDefined();
      expect(file1Node.hash).toBeDefined();
    });

    it("should push all files with --all flag", async () => {
      // Create test files in different directories
      await fs.writeFile("file1.txt", "content1");
      await fs.mkdir("subdir");
      await fs.writeFile("subdir/file2.txt", "content2");

      // Create some files to ignore
      await fs.mkdir("node_modules");
      await fs.writeFile("node_modules/test.js", "should be ignored");
      await fs.mkdir(".git");
      await fs.writeFile(".git/config", "should be ignored");

      await pushCommand(undefined, {
        projectId: "proj-123",
        all: true,
      });

      expect(console.log).toHaveBeenCalledWith(
        chalk.blue("Found 2 files to push"),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pushed 2 files"),
      );

      // Verify the files are actually in the YDoc
      expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "subdir/file2.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "node_modules/test.js")).toBe(
        false,
      );
      expect(mockServer.hasFile("proj-123", ".git/config")).toBe(false);

      // Verify total file count
      const allFiles = mockServer.getAllFiles("proj-123");
      expect(allFiles).toHaveLength(2);
      expect(allFiles).toContain("file1.txt");
      expect(allFiles).toContain("subdir/file2.txt");
    });

    it("should fail fast on network errors", async () => {
      // Create test file
      await fs.writeFile("file1.txt", "content1");

      // Mock server to return error
      server.use(
        http.patch("http://localhost:3000/api/projects/proj-123", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        }),
      );

      // Should throw on error (fail fast)
      await expect(
        pushCommand("file1.txt", {
          projectId: "proj-123",
        }),
      ).rejects.toThrow("Failed to sync to remote");
    });

    it("should fail fast on batch push with network error", async () => {
      // Create test files
      await fs.writeFile("file1.txt", "content1");
      await fs.writeFile("file2.txt", "content2");

      // Mock server to return error on PATCH
      server.use(
        http.patch("http://localhost:3000/api/projects/proj-123", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        }),
      );

      // Should throw on error (fail fast for batch)
      await expect(
        pushCommand(undefined, {
          projectId: "proj-123",
          all: true,
        }),
      ).rejects.toThrow("Failed to sync to remote");
    });

    it("should throw error when no file path", async () => {
      await expect(
        pushCommand(undefined, { projectId: "proj-123" }),
      ).rejects.toThrow("File path is required");
    });

    it("should handle missing file error", async () => {
      // Don't create the file, so it will be missing
      await expect(
        pushCommand("nonexistent.txt", { projectId: "proj-123" }),
      ).rejects.toThrow();
    });
  });

  describe("pullCommand", () => {
    it("should pull a file successfully", async () => {
      // Add test file to the project using existing mockServer
      mockServer.addFileToProject("proj-123", "test.txt", "test file content");

      await pullCommand("test.txt", { projectId: "proj-123" });

      // Check that file was created
      const fileExists = await fs
        .access("test.txt")
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Check file content
      const content = await fs.readFile("test.txt", "utf8");
      expect(content).toBe("test file content");

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pulled to test.txt"),
      );
    });

    it("should pull a file to custom output path", async () => {
      // Add test file to the project using existing mockServer
      mockServer.addFileToProject(
        "proj-123",
        "remote/file.txt",
        "remote file content",
      );

      // Create the directory structure
      await fs.mkdir("local", { recursive: true });

      await pullCommand("remote/file.txt", {
        projectId: "proj-123",
        output: "local/output.txt",
      });

      // Check that file was created in the correct location
      const fileExists = await fs
        .access("local/output.txt")
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Check file content
      const content = await fs.readFile("local/output.txt", "utf8");
      expect(content).toBe("remote file content");

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pulled to local/output.txt"),
      );
    });

    it("should handle project not found error", async () => {
      // Override handler for this specific test
      server.use(
        http.get(
          "http://localhost:3000/api/projects/:projectId",
          ({ params }) => {
            if (params.projectId === "nonexistent") {
              return HttpResponse.json(
                {
                  error: "project_not_found",
                  error_description: "Project not found",
                },
                { status: 404 },
              );
            }
            // Fall back to default handler
            return HttpResponse.json(
              {
                error: "project_not_found",
                error_description: "Project not found",
              },
              { status: 404 },
            );
          },
        ),
      );

      await expect(
        pullCommand("test.txt", { projectId: "nonexistent" }),
      ).rejects.toThrow();
    });
  });
});
