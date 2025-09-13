import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncProjectToGitHub, getSyncStatus } from "./sync";
import * as Y from "yjs";
import { initServices } from "../init-services";
import { PROJECTS_TBL } from "../../db/schema/projects";
import { githubRepos } from "../../db/schema/github";
import { SESSIONS_TBL, TURNS_TBL, BLOCKS_TBL } from "../../db/schema/sessions";
import { SHARE_LINKS_TBL } from "../../db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../db/schema/agent-sessions";
import "../../test/msw-setup";

// Note: Using real GitHub client with MSW mocking the API endpoints
// Test environment variables are configured in src/test/setup.ts

// Mock the GitHub authentication to prevent real JWT generation
vi.mock("./auth", () => ({
  getInstallationToken: vi
    .fn()
    .mockResolvedValue("ghs_test_installation_token_12345"),
}));

describe("GitHub Sync", () => {
  beforeEach(async () => {
    // Set up environment variables for blob storage
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";

    // Initialize real services (will use test database)
    initServices();

    // Clean up test data in correct order (child tables first)
    const db = globalThis.services.db;
    await db.delete(BLOCKS_TBL);
    await db.delete(TURNS_TBL);
    await db.delete(SESSIONS_TBL);
    await db.delete(SHARE_LINKS_TBL);
    await db.delete(AGENT_SESSIONS_TBL);
    await db.delete(githubRepos);
    await db.delete(PROJECTS_TBL);
  });

  describe("syncProjectToGitHub", () => {
    it("should successfully sync files to GitHub", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create a YDoc with test files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      filesMap.set("package.json", { hash: "hash456", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      blobsMap.set("hash456", { size: 200 });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert test project into real database
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      // Insert test repository link into real database
      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      // Execute sync (MSW will handle GitHub API calls)
      const result = await syncProjectToGitHub(projectId, userId);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("new-commit-sha-202");
      expect(result.filesCount).toBe(2);
      expect(result.message).toContain("Successfully synced 2 files");
    });

    it("should return error when project not found", async () => {
      const projectId = "proj_notfound";
      const userId = "user_123";

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found");
    });

    it("should return error when user is not authorized", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const otherUserId = "user_456";
      const db = globalThis.services.db;

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert project owned by different user
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: otherUserId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when repository not linked", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert project without repository link
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Repository not linked to project");
    });

    it("should return error when no files to sync", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create empty YDoc (no files)
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert test project
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      // Insert test repository link
      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No files to sync");
    });

    it("should throw error when blob storage not configured", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Remove blob token to simulate configuration error
      const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.BLOB_READ_WRITE_TOKEN;

      // Create YDoc with files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");
      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert test data
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      // Now expect the function to throw instead of returning error
      await expect(syncProjectToGitHub(projectId, userId)).rejects.toThrow(
        "Blob storage not configured",
      );

      // Restore token
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    });
  });

  describe("getSyncStatus", () => {
    it("should return linked status when repository exists", async () => {
      const projectId = "proj_test123";
      const db = globalThis.services.db;

      // Insert test repository link
      const insertResult = await db
        .insert(githubRepos)
        .values({
          projectId,
          installationId: 12345,
          repoName: "test-repo",
          repoId: 67890,
        })
        .returning();

      const status = await getSyncStatus(projectId);

      expect(status.linked).toBe(true);
      expect(status.repoId).toBe(67890);
      expect(status.repoName).toBe("test-repo");
      expect(status.lastSynced).toEqual(insertResult[0]!.updatedAt);
    });

    it("should return unlinked status when repository does not exist", async () => {
      const projectId = "proj_nonexistent";

      const status = await getSyncStatus(projectId);

      expect(status.linked).toBe(false);
      expect(status.message).toBe("No GitHub repository linked");
    });
  });

  describe("extractFilesFromYDoc", () => {
    it("should extract files correctly from YDoc data", async () => {
      // This tests the YDoc parsing logic directly with real YDoc operations
      const projectId = "proj_test123";
      const userId = "user_123";
      const db = globalThis.services.db;

      // Create complex YDoc with multiple files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      // Add various file types
      const files = [
        { path: "src/index.ts", hash: "hash1", size: 1000 },
        { path: "src/utils/helper.ts", hash: "hash2", size: 500 },
        { path: "README.md", hash: "hash3", size: 300 },
        { path: ".gitignore", hash: "hash4", size: 100 },
      ];

      files.forEach((file) => {
        filesMap.set(file.path, { hash: file.hash, mtime: Date.now() });
        blobsMap.set(file.hash, { size: file.size });
      });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert test project
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(true);
      expect(result.filesCount).toBe(4);
      expect(result.message).toContain("Successfully synced 4 files");
    });
  });
});
