import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
  getUserInstallations,
  removeRepositoryLink,
} from "./repository";
import { initServices } from "../init-services";
import { githubInstallations, githubRepos } from "../../db/schema/github";
import { eq } from "drizzle-orm";
import { createInstallationOctokit } from "./client";
import type { Octokit } from "@octokit/core";

// Mock the client module - we still need to mock external APIs
vi.mock("./client", () => ({
  createInstallationOctokit: vi.fn(),
}));

describe("GitHub Repository", () => {
  const testUserId = "test-user-123";
  const testProjectId = "test-project-456";
  const testInstallationId = 99999;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize real database connection
    initServices();
    const db = globalThis.services.db;
    
    // Clean up test data before each test
    await db.delete(githubRepos).where(eq(githubRepos.projectId, testProjectId));
    await db.delete(githubInstallations).where(eq(githubInstallations.userId, testUserId));
  });

  describe("createProjectRepository", () => {
    it("should create a new repository for a project", async () => {
      // Setup GitHub API mock
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 987654,
            name: `uspark-${testProjectId}`,
            full_name: `testuser/uspark-${testProjectId}`,
            html_url: `https://github.com/testuser/uspark-${testProjectId}`,
            clone_url: `https://github.com/testuser/uspark-${testProjectId}.git`,
          },
        }),
      } as unknown as Octokit;
      vi.mocked(createInstallationOctokit).mockResolvedValue(mockOctokit);
      
      // Create repository
      const result = await createProjectRepository(testProjectId, testInstallationId);
      
      expect(result).toEqual({
        repoId: 987654,
        repoName: `uspark-${testProjectId}`,
        fullName: `testuser/uspark-${testProjectId}`,
        url: `https://github.com/testuser/uspark-${testProjectId}`,
        cloneUrl: `https://github.com/testuser/uspark-${testProjectId}.git`,
      });
      
      // Verify GitHub API was called correctly
      expect(mockOctokit.request).toHaveBeenCalledWith("POST /user/repos", {
        name: `uspark-${testProjectId}`,
        private: true,
        auto_init: true,
        description: `uSpark sync repository for project ${testProjectId}`,
      });
      
      // Verify database record was created
      const db = globalThis.services.db;
      const repos = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, testProjectId));
      
      expect(repos).toHaveLength(1);
      expect(repos[0]).toMatchObject({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: `uspark-${testProjectId}`,
        repoId: 987654,
      });
    });
    
    it("should throw error if repository already exists", async () => {
      // Create existing repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: `uspark-${testProjectId}`,
        repoId: 111111,
      });
      
      await expect(
        createProjectRepository(testProjectId, testInstallationId)
      ).rejects.toThrow(`Repository already exists for project ${testProjectId}`);
    });
  });

  describe("getProjectRepository", () => {
    it("should return repository info for existing project", async () => {
      // Create repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: `uspark-${testProjectId}`,
        repoId: 987654,
      });
      
      const result = await getProjectRepository(testProjectId);
      
      expect(result).toMatchObject({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: `uspark-${testProjectId}`,
        repoId: 987654,
      });
    });
    
    it("should return null for non-existent project", async () => {
      const result = await getProjectRepository("non-existent-project");
      expect(result).toBeNull();
    });
  });

  describe("hasInstallationAccess", () => {
    it("should return true for user with access", async () => {
      // Create installation for user
      const db = globalThis.services.db;
      await db.insert(githubInstallations).values({
        userId: testUserId,
        installationId: testInstallationId,
        accountName: "testuser",
      });
      
      const result = await hasInstallationAccess(testUserId, testInstallationId);
      expect(result).toBe(true);
    });
    
    it("should return false for user without access", async () => {
      const result = await hasInstallationAccess(testUserId, testInstallationId);
      expect(result).toBe(false);
    });
  });

  describe("getUserInstallations", () => {
    it("should return user installations", async () => {
      // Create multiple installations for user
      const db = globalThis.services.db;
      await db.insert(githubInstallations).values([
        {
          userId: testUserId,
          installationId: testInstallationId,
          accountName: "testuser",
        },
        {
          userId: testUserId,
          installationId: testInstallationId + 1,
          accountName: "testorg",
        },
      ]);
      
      const result = await getUserInstallations(testUserId);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: testUserId,
        installationId: testInstallationId,
        accountName: "testuser",
      });
      expect(result[1]).toMatchObject({
        userId: testUserId,
        installationId: testInstallationId + 1,
        accountName: "testorg",
      });
    });
    
    it("should return empty array for user with no installations", async () => {
      const result = await getUserInstallations("user-without-installations");
      expect(result).toEqual([]);
    });
  });

  describe("removeRepositoryLink", () => {
    it("should remove repository link from database", async () => {
      // Create repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: `uspark-${testProjectId}`,
        repoId: 987654,
      });
      
      // Verify it exists
      let repos = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, testProjectId));
      expect(repos).toHaveLength(1);
      
      // Remove it
      const result = await removeRepositoryLink(testProjectId);
      expect(result).toBe(1);
      
      // Verify it's gone
      repos = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, testProjectId));
      expect(repos).toHaveLength(0);
    });
    
    it("should return 0 if no repository found", async () => {
      const result = await removeRepositoryLink("non-existent-project");
      expect(result).toBe(0);
    });
  });
});