// Mock @vercel/blob module BEFORE other imports
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://mock-store-id.public.blob.vercel-storage.com/projects/test/mock-hash",
    pathname: "projects/test/mock-hash",
    contentType: "text/plain",
    downloadUrl:
      "https://mock-store-id.public.blob.vercel-storage.com/projects/test/mock-hash",
  }),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushCommand, pullCommand } from "../sync";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { http, HttpResponse } from "msw";
import { mockServer } from "../../test/mock-server";
import { server } from "../../test/setup";
import { put } from "@vercel/blob";
import { setOverrideProjectConfig } from "../../project-config";

describe("sync commands", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temporary directory for real file system operations
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "uspark-test-"));
    process.chdir(tempDir);

    // Set environment variables for authentication
    process.env.USPARK_TOKEN = "test-token";
    process.env.USPARK_API_URL = "http://localhost:3000";

    // Set project config override
    setOverrideProjectConfig({
      projectId: "proj-123",
      version: "0",
    });

    // Reset mock server
    mockServer.reset();

    // Reset and reconfigure the @vercel/blob mock
    vi.mocked(put).mockResolvedValue({
      url: "https://mock-store-id.public.blob.vercel-storage.com/projects/test/mock-hash",
      pathname: "projects/test/mock-hash",
      contentType: "text/plain",
      contentDisposition: 'attachment; filename="test"',
      downloadUrl:
        "https://mock-store-id.public.blob.vercel-storage.com/projects/test/mock-hash",
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Clean up environment variables
    delete process.env.USPARK_TOKEN;
    delete process.env.USPARK_API_URL;

    // Clear project config override
    setOverrideProjectConfig(null);

    vi.restoreAllMocks();
  });

  describe("pushCommand", () => {
    it("should push all files successfully", async () => {
      // Create test files
      await fs.writeFile("file1.txt", "content1");
      await fs.mkdir("dir", { recursive: true });
      await fs.writeFile("dir/file2.txt", "content2");

      await pushCommand({});

      // Verify the files were pushed to the server
      expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "dir/file2.txt")).toBe(true);
    });

    it("should actually update the YDoc with pushed files", async () => {
      // Create test files
      await fs.writeFile("file1.txt", "content1");
      await fs.mkdir("dir", { recursive: true });
      await fs.writeFile("dir/file2.txt", "content2");

      // Push all files
      await pushCommand({});

      // Verify both files are in the YDoc
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

    it("should push all files and ignore excluded directories", async () => {
      // Create test files in different directories
      await fs.writeFile("file1.txt", "content1");
      await fs.mkdir("subdir");
      await fs.writeFile("subdir/file2.txt", "content2");

      // Create some files to ignore
      await fs.mkdir("node_modules");
      await fs.writeFile("node_modules/test.js", "should be ignored");
      await fs.mkdir(".git");
      await fs.writeFile(".git/config", "should be ignored");
      await fs.writeFile(".DS_Store", "should be ignored");
      await fs.writeFile("subdir/.DS_Store", "should be ignored");

      await pushCommand({});

      // Verify the files are actually in the YDoc
      expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "subdir/file2.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "node_modules/test.js")).toBe(
        false,
      );
      expect(mockServer.hasFile("proj-123", ".git/config")).toBe(false);
      expect(mockServer.hasFile("proj-123", ".DS_Store")).toBe(false);
      expect(mockServer.hasFile("proj-123", "subdir/.DS_Store")).toBe(false);

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
      await expect(pushCommand({})).rejects.toThrow("Failed to sync to remote");
    });

    it("should use projectId from option if provided", async () => {
      // Create test file
      await fs.writeFile("test.txt", "test content");

      // Use a different project ID
      await pushCommand({ projectId: "proj-456" });

      // Verify the file was pushed to the correct project
      expect(mockServer.hasFile("proj-456", "test.txt")).toBe(true);
      expect(mockServer.hasFile("proj-123", "test.txt")).toBe(false);
    });
  });

  describe("pullCommand", () => {
    it("should pull all files successfully", async () => {
      // Add test files to the project using existing mockServer
      mockServer.addFileToProject("proj-123", "test.txt", "test file content");
      mockServer.addFileToProject(
        "proj-123",
        "dir/file.txt",
        "nested file content",
      );

      await pullCommand({});

      // Check that files were created
      const file1Exists = await fs
        .access("test.txt")
        .then(() => true)
        .catch(() => false);
      expect(file1Exists).toBe(true);

      const file2Exists = await fs
        .access("dir/file.txt")
        .then(() => true)
        .catch(() => false);
      expect(file2Exists).toBe(true);

      // Check file contents
      const content1 = await fs.readFile("test.txt", "utf8");
      expect(content1).toBe("test file content");

      const content2 = await fs.readFile("dir/file.txt", "utf8");
      expect(content2).toBe("nested file content");
    });

    it("should pull to current directory", async () => {
      // Add test file to the project using existing mockServer
      mockServer.addFileToProject(
        "proj-123",
        "remote/file.txt",
        "remote file content",
      );

      await pullCommand({});

      // Check that file was created in current directory with original path structure
      const fileExists = await fs
        .access("remote/file.txt")
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Check file content
      const content = await fs.readFile("remote/file.txt", "utf8");
      expect(content).toBe("remote file content");
    });

    it("should use projectId from option if provided", async () => {
      // Add test file to a different project
      mockServer.addFileToProject("proj-456", "test.txt", "test content");

      await pullCommand({ projectId: "proj-456" });

      // Check that file was pulled
      const fileExists = await fs
        .access("test.txt")
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile("test.txt", "utf8");
      expect(content).toBe("test content");
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

      await expect(pullCommand({ projectId: "nonexistent" })).rejects.toThrow();
    });
  });
});
