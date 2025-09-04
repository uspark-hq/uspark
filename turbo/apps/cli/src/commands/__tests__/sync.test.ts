import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { pushCommand, pullCommand } from "../sync";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { mockServer } from "../../test/mock-server";

// Create MSW server to mock API responses
const server = setupServer(
  // Mock GET /api/projects/:projectId (returns YJS document state)
  http.get("http://localhost:3000/api/projects/:projectId", ({ params }) => {
    const projectId = params.projectId as string;
    
    if (projectId === "nonexistent") {
      return HttpResponse.json(
        { error: "project_not_found", error_description: "Project not found" },
        { status: 404 }
      );
    }
    
    // Use existing mockServer
    const ydocState = mockServer.getProject(projectId);
    return new HttpResponse(ydocState, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Version": "0",
      },
    });
  }),
  
  // Mock PATCH /api/projects/:projectId (accepts YJS updates)
  http.patch("http://localhost:3000/api/projects/:projectId", () => {
    return new HttpResponse("OK", {
      headers: {
        "X-Version": "1",
      },
    });
  }),
  
  // Mock GET /api/blobs/:hash (returns file content)  
  http.get("http://localhost:3000/api/blobs/:hash", ({ params }) => {
    const hash = params.hash as string;
    const content = mockServer.getBlobContent(hash);
    if (content) {
      return HttpResponse.text(content);
    }
    // Return 404 for missing blobs to match real behavior
    return HttpResponse.json(
      { error: "blob_not_found" },
      { status: 404 }
    );
  }),
);

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
    
    // Start MSW server
    server.listen();
    
    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    // Clean up environment variables
    delete process.env.USPARK_TOKEN;
    delete process.env.USPARK_API_URL;
    
    // Reset MSW handlers
    server.resetHandlers();
    
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
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

    it("should push all files with --all flag", async () => {
      // Create test files in current directory
      await fs.writeFile("file1.txt", "content1");
      await fs.writeFile("file2.js", "content2");
      await fs.mkdir("subdir");
      await fs.writeFile("subdir/file3.md", "content3");

      await pushCommand(undefined, {
        projectId: "proj-123",
        all: true,
      });

      // Check that batch push was completed
      expect(console.log).toHaveBeenCalledWith(
        chalk.blue("Pushing all files to project proj-123..."),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Push completed: 3 files pushed"),
      );
    });

    it("should fail fast on network errors during batch push", async () => {
      // Create test files
      await fs.writeFile("file1.txt", "content1");
      await fs.writeFile("file2.txt", "content2");

      // Mock server to return error
      server.use(
        http.patch("http://localhost:3000/api/projects/proj-123", () => {
          return HttpResponse.json(
            { error: "Server error" },
            { status: 500 }
          );
        })
      );

      // Should throw on error (fail fast)
      await expect(
        pushCommand(undefined, {
          projectId: "proj-123",
          all: true,
        })
      ).rejects.toThrow("Failed to sync to remote");
    });

    it("should throw error when no file path and no --all flag", async () => {
      await expect(
        pushCommand(undefined, { projectId: "proj-123" }),
      ).rejects.toThrow("File path is required when not using --all flag");
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
      const fileExists = await fs.access("test.txt").then(() => true).catch(() => false);
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
      mockServer.addFileToProject("proj-123", "remote/file.txt", "remote file content");
      
      // Create the directory structure
      await fs.mkdir("local", { recursive: true });
      
      await pullCommand("remote/file.txt", {
        projectId: "proj-123",
        output: "local/output.txt",
      });

      // Check that file was created in the correct location
      const fileExists = await fs.access("local/output.txt").then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Check file content
      const content = await fs.readFile("local/output.txt", "utf8");
      expect(content).toBe("remote file content");
      
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pulled to local/output.txt"),
      );
    });

    it("should handle project not found error", async () => {
      // Mock server to return 404 for this project
      server.use(
        http.get("http://localhost:3000/api/projects/nonexistent", () => {
          return HttpResponse.json(
            { error: "project_not_found", error_description: "Project not found" },
            { status: 404 }
          );
        })
      );

      await expect(
        pullCommand("test.txt", { projectId: "nonexistent" }),
      ).rejects.toThrow();
    });
  });
});