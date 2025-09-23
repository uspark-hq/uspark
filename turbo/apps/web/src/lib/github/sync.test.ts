import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncProjectToGitHub, getSyncStatus } from "./sync";
import * as Y from "yjs";
import {
  createTestProjectForUser,
  linkGitHubRepository,
} from "../../test/db-test-utils";
import "../../test/msw-setup";

// Note: Using real GitHub client with MSW mocking the API endpoints
// Test environment variables are configured in src/test/setup.ts

// Mock the GitHub authentication to prevent real JWT generation
vi.mock("./auth", () => ({
  getInstallationToken: vi
    .fn()
    .mockResolvedValue("ghs_test_installation_token_12345"),
}));

// Mock getInstallationDetails to avoid real API calls
vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    getInstallationDetails: vi.fn().mockResolvedValue({
      account: {
        type: "User",
        login: "testuser",
      },
    }),
  };
});

describe("GitHub Sync", () => {
  beforeEach(async () => {
    // Set up environment variables for blob storage
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";

    // Clean up test data - no need since we're using fresh database
    // Each test run gets a completely new database
  });

  describe("syncProjectToGitHub", () => {
    it("should successfully sync files to GitHub", async () => {
      const projectId = "123e4567-e89b-12d3-a456-426614174000";
      const userId = "user_123";

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

      // Create test project using utility function
      await createTestProjectForUser(userId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      // Link GitHub repository using utility function
      await linkGitHubRepository(projectId, 12345, "test-repo", 67890);

      // Execute sync (MSW will handle GitHub API calls)
      const result = await syncProjectToGitHub(projectId, userId);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("new-commit-sha-202");
      expect(result.filesCount).toBe(2);
      expect(result.message).toContain("Successfully synced 2 files");
    });

    it("should return error when project not found", async () => {
      const projectId = "404e4567-e89b-12d3-a456-426614174404";
      const userId = "user_123";

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found");
    });

    it("should return error when user is not authorized", async () => {
      const projectId = "auth-test-" + Date.now() + "-" + Math.random();
      const userId = "user_123";
      const otherUserId = "user_456";

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Create project owned by different user using utility function
      await createTestProjectForUser(otherUserId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when repository not linked", async () => {
      const projectId = "nolink-test-" + Date.now() + "-" + Math.random();
      const userId = "user_123";

      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Create project without repository link using utility function
      await createTestProjectForUser(userId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Repository not linked to project");
    });

    it("should return error when no files to sync", async () => {
      const projectId = "nofiles-test-" + Date.now() + "-" + Math.random();
      const userId = "user_123";

      // Create empty YDoc (no files)
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Create test project and repository link using utility functions
      await createTestProjectForUser(userId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      await linkGitHubRepository(projectId, 12345, "test-repo", 67890);

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No files to sync");
    });

    it("should throw error when blob storage not configured", async () => {
      const projectId = "noblob-test-" + Date.now() + "-" + Math.random();
      const userId = "user_123";

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

      // Create test data using utility functions
      await createTestProjectForUser(userId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      await linkGitHubRepository(projectId, 12345, "test-repo", 67890);

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
      const projectId = "linked-test-" + Date.now() + "-" + Math.random();

      // Link repository using utility function
      const repo = await linkGitHubRepository(
        projectId,
        12345,
        "test-repo",
        67890,
      );

      const status = await getSyncStatus(projectId);

      expect(repo).toBeDefined();
      expect(status.linked).toBe(true);
      expect(status.repoId).toBe(67890);
      expect(status.repoName).toBe("test-repo");
      expect(status.lastSynced).toEqual(repo!.updatedAt);
    });

    it("should return unlinked status when repository does not exist", async () => {
      const projectId = "404e4567-e89b-12d3-a456-426614174404";

      const status = await getSyncStatus(projectId);

      expect(status.linked).toBe(false);
      expect(status.message).toBe("No GitHub repository linked");
    });
  });

  describe("extractFilesFromYDoc", () => {
    it("should extract files correctly from YDoc data", async () => {
      // This tests the YDoc parsing logic directly with real YDoc operations
      const projectId = "extract-test-" + Date.now() + "-" + Math.random();
      const userId = "user_123";

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

      // Create test project and repository link using utility functions
      await createTestProjectForUser(userId, {
        id: projectId,
        ydocData,
        version: 0,
      });

      await linkGitHubRepository(projectId, 12345, "test-repo", 67890);

      const result = await syncProjectToGitHub(projectId, userId);

      expect(result.success).toBe(true);
      expect(result.filesCount).toBe(4);
      expect(result.message).toContain("Successfully synced 4 files");
    });
  });
});
