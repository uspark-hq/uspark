import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncProjectToGitHub, getSyncStatus } from "./sync";
import * as Y from "yjs";
// Mock dependencies
vi.mock("./client", () => ({
  createInstallationOctokit: vi.fn(),
}));

vi.mock("./repository", () => ({
  getProjectRepository: vi.fn(),
}));

vi.mock("../init-services", () => ({
  initServices: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock the database module
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

describe("GitHub Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";
    
    // Mock global services
    globalThis.services = {} as never;
  });

  describe("syncProjectToGitHub", () => {
    it("should successfully sync files to GitHub", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      
      // Create a YDoc with test files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");
      
      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");
      
      // Mock database response
      const mockProject = {
        id: projectId,
        userId,
        ydocData,
        version: 0,
      };
      
      // Setup db mock for this test
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      globalThis.services.db = { select: () => mockQueryBuilder } as never;
      mockQueryBuilder.limit.mockResolvedValue([mockProject]);
      
      // Mock repository info
      const { getProjectRepository } = await import("./repository");
      (getProjectRepository as ReturnType<typeof vi.fn>).mockResolvedValue({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });
      
      // Mock Octokit client with proper sequential responses
      const mockOctokit = {
        request: vi.fn(),
      };
      
      // Set up sequential mock responses for each API call
      mockOctokit.request
        .mockResolvedValueOnce({ data: { account: { login: "test-owner" } } }) // GET installation (called first to get owner)
        .mockResolvedValueOnce({ data: { object: { sha: "current-sha" } } }) // GET ref
        .mockResolvedValueOnce({ data: { tree: { sha: "tree-sha" } } }) // GET commit
        .mockResolvedValueOnce({ data: { sha: "blob-sha" } }) // POST blob
        .mockResolvedValueOnce({ data: { sha: "new-tree-sha" } }) // POST tree
        .mockResolvedValueOnce({ data: { sha: "new-commit-sha" } }) // POST commit
        .mockResolvedValueOnce({ data: {} }); // PATCH ref
      
      const { createInstallationOctokit } = await import("./client");
      (createInstallationOctokit as ReturnType<typeof vi.fn>).mockResolvedValue(mockOctokit);
      
      // Mock blob fetch
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(10),
      });
      
      // Execute sync
      const result = await syncProjectToGitHub(projectId, userId);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("new-commit-sha");
      expect(result.filesCount).toBe(1);
      expect(result.message).toContain("Successfully synced 1 files");
      
      // Verify Octokit was called correctly
      expect(mockOctokit.request).toHaveBeenCalledWith(
        "POST /repos/{owner}/{repo}/git/commits",
        expect.objectContaining({
          message: expect.stringContaining("Sync from uSpark"),
        }),
      );
    });

    it("should return error when project not found", async () => {
      const projectId = "proj_notfound";
      const userId = "user_123";
      
      // Mock empty database response
      // Setup db mock for this test
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      globalThis.services.db = { select: () => mockQueryBuilder } as never;
      mockQueryBuilder.limit.mockResolvedValue([]);
      
      const result = await syncProjectToGitHub(projectId, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found");
    });

    it("should return error when user is not authorized", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      const otherUserId = "user_456";
      
      // Mock project owned by different user
      const mockProject = {
        id: projectId,
        userId: otherUserId,
        ydocData: "",
        version: 0,
      };
      
      // Setup db mock for this test
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      globalThis.services.db = { select: () => mockQueryBuilder } as never;
      mockQueryBuilder.limit.mockResolvedValue([mockProject]);
      
      const result = await syncProjectToGitHub(projectId, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when repository not linked", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      
      // Mock project
      const mockProject = {
        id: projectId,
        userId,
        ydocData: "",
        version: 0,
      };
      
      // Setup db mock for this test
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      globalThis.services.db = { select: () => mockQueryBuilder } as never;
      mockQueryBuilder.limit.mockResolvedValue([mockProject]);
      
      // Mock no repository
      const { getProjectRepository } = await import("./repository");
      (getProjectRepository as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const result = await syncProjectToGitHub(projectId, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Repository not linked to project");
    });

    it("should return error when no files to sync", async () => {
      const projectId = "proj_test123";
      const userId = "user_123";
      
      // Create empty YDoc
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");
      
      // Mock project
      const mockProject = {
        id: projectId,
        userId,
        ydocData,
        version: 0,
      };
      
      // Setup db mock for this test
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      globalThis.services.db = { select: () => mockQueryBuilder } as never;
      mockQueryBuilder.limit.mockResolvedValue([mockProject]);
      
      // Mock repository info
      const { getProjectRepository } = await import("./repository");
      (getProjectRepository as ReturnType<typeof vi.fn>).mockResolvedValue({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });
      
      const result = await syncProjectToGitHub(projectId, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("No files to sync");
    });
  });

  describe("getSyncStatus", () => {
    it("should return linked status when repository exists", async () => {
      const projectId = "proj_test123";
      const mockRepo = {
        projectId,
        repoId: 67890,
        repoName: "test-repo",
        updatedAt: new Date(),
      };
      
      const { getProjectRepository } = await import("./repository");
      (getProjectRepository as ReturnType<typeof vi.fn>).mockResolvedValue(mockRepo);
      
      const status = await getSyncStatus(projectId);
      
      expect(status.linked).toBe(true);
      expect(status.repoId).toBe(67890);
      expect(status.repoName).toBe("test-repo");
      expect(status.lastSynced).toEqual(mockRepo.updatedAt);
    });

    it("should return unlinked status when repository does not exist", async () => {
      const projectId = "proj_test123";
      
      const { getProjectRepository } = await import("./repository");
      (getProjectRepository as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const status = await getSyncStatus(projectId);
      
      expect(status.linked).toBe(false);
      expect(status.message).toBe("No GitHub repository linked");
    });
  });
});