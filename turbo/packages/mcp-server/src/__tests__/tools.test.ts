import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm, readFile, readdir } from "fs/promises";
import { mockServer } from "./mock-server";
import { handleUsparkPull } from "../tools/pull";
import { handleUsparkStatus } from "../tools/status";
import { handleUsparkListFiles } from "../tools/list-files";
import type { UsparkConfig } from "../config";

describe("MCP Tool Handlers", () => {
  let tempDir: string;
  let config: UsparkConfig;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "uspark-mcp-test-"));
    mockServer.reset();

    config = {
      token: "test-token",
      projectId: "test-project",
      apiUrl: "http://localhost:3000",
      syncInterval: 3600000,
      outputDir: tempDir,
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("handleUsparkPull", () => {
    it("should pull files successfully", async () => {
      // Setup mock project with files
      mockServer.addFileToProject(
        "test-project",
        "README.md",
        "# Test Project",
      );
      mockServer.addFileToProject(
        "test-project",
        "src/index.ts",
        "console.log('hello');",
      );

      const result = await handleUsparkPull(config);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Successfully pulled 2 files");
      expect(result.content[0].text).toContain("test-project");

      // Verify files were written to disk
      const readmeContent = await readFile(join(tempDir, "README.md"), "utf8");
      expect(readmeContent).toBe("# Test Project");

      const indexContent = await readFile(
        join(tempDir, "src/index.ts"),
        "utf8",
      );
      expect(indexContent).toBe("console.log('hello');");
    });

    it("should handle empty project", async () => {
      const result = await handleUsparkPull(config);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Successfully pulled 0 files");

      // Verify output directory was created
      const files = await readdir(tempDir);
      expect(files).toHaveLength(0);
    });

    it("should return error on failure", async () => {
      // Use invalid project ID to trigger error
      const badConfig = { ...config, projectId: "nonexistent" };

      // Mock server to return error
      global.fetch = async (url: string) => {
        if (url.includes("nonexistent")) {
          return new Response("Not found", { status: 404 });
        }
        return new Response();
      };

      const result = await handleUsparkPull(badConfig);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to pull project");
    });
  });

  describe("handleUsparkStatus", () => {
    it("should return status information", async () => {
      const result = await handleUsparkStatus(config);

      expect(result.content).toHaveLength(1);
      const statusText = result.content[0].text;

      expect(statusText).toContain("uSpark MCP Server Status");
      expect(statusText).toContain("test-project");
      expect(statusText).toContain("http://localhost:3000");
      expect(statusText).toContain(tempDir);
      expect(statusText).toContain("60 minutes");
      expect(statusText).toContain("uspark_pull");
      expect(statusText).toContain("uspark_status");
      expect(statusText).toContain("uspark_list_files");
    });
  });

  describe("handleUsparkListFiles", () => {
    it.todo("should list files in project", async () => {
      // Setup mock project with files
      mockServer.addFileToProject("test-project", "README.md", "# Test");
      mockServer.addFileToProject("test-project", "package.json", "{}");
      mockServer.addFileToProject("test-project", "src/index.ts", "code");

      const result = await handleUsparkListFiles(config);

      // Debug: log if there's an error
      if (result.isError) {
        console.error("Error occurred:", result.content[0].text);
      }

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const listText = result.content[0].text;
      expect(listText).toContain("3 total");
      expect(listText).toContain("1. package.json");
      expect(listText).toContain("2. README.md");
      expect(listText).toContain("3. src/index.ts");
    });

    it.todo("should handle empty project", async () => {
      const result = await handleUsparkListFiles(config);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("No files found");
    });

    it("should return error on failure", async () => {
      const badConfig = { ...config, projectId: "nonexistent" };

      global.fetch = async (url: string) => {
        if (url.includes("nonexistent")) {
          return new Response("Not found", { status: 404 });
        }
        return new Response();
      };

      const result = await handleUsparkListFiles(badConfig);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to list files");
    });
  });
});
