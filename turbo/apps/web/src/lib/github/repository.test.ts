import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
  getUserInstallations,
  removeRepositoryLink,
  linkExistingRepository,
} from "./repository";
import { initServices } from "../init-services";
import { githubInstallations, githubRepos } from "../../db/schema/github";
import { eq } from "drizzle-orm";
import { createInstallationOctokit, getInstallationDetails } from "./client";
import type { Octokit } from "@octokit/core";

// Mock the client module - we still need to mock external APIs
vi.mock("./client", () => ({
  createInstallationOctokit: vi.fn(),
  getInstallationDetails: vi.fn(),
}));

describe("GitHub Repository", () => {
  const testUserId = "test-user-123";
  const testProjectId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"; // Valid UUID
  const testInstallationId = 99999;
  const expectedRepoName = `uspark-${testProjectId.substring(0, 8)}`; // uspark-a1b2c3d4

  beforeEach(async () => {
    vi.clearAllMocks();

    // Initialize real database connection
    initServices();
    const db = globalThis.services.db;

    // Clean up test data before each test
    await db
      .delete(githubRepos)
      .where(eq(githubRepos.projectId, testProjectId));
    await db
      .delete(githubInstallations)
      .where(eq(githubInstallations.userId, testUserId));
  });

  describe("createProjectRepository", () => {
    it("should create a new repository for a project", async () => {
      // Setup GitHub API mock
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 987654,
            name: expectedRepoName,
            full_name: `testuser/uspark-${testProjectId}`,
            html_url: `https://github.com/testuser/uspark-${testProjectId}`,
            clone_url: `https://github.com/testuser/uspark-${testProjectId}.git`,
          },
        }),
      } as unknown as Octokit;
      vi.mocked(createInstallationOctokit).mockResolvedValue(mockOctokit);

      // Mock installation details to return a user account (not org)
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "User",
          login: "testuser",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      // Create repository
      const result = await createProjectRepository(
        testProjectId,
        testInstallationId,
      );

      expect(result).toEqual({
        repoId: 987654,
        repoName: expectedRepoName,
        fullName: `testuser/uspark-${testProjectId}`,
        url: `https://github.com/testuser/uspark-${testProjectId}`,
        cloneUrl: `https://github.com/testuser/uspark-${testProjectId}.git`,
      });

      // Verify GitHub API was called correctly
      expect(mockOctokit.request).toHaveBeenCalledWith("POST /user/repos", {
        name: expectedRepoName,
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
        repoName: expectedRepoName,
        repoId: 987654,
      });
    });

    it("should create a repository in an organization account", async () => {
      // Setup GitHub API mock
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 987654,
            name: expectedRepoName,
            full_name: `testorg/uspark-${testProjectId}`,
            html_url: `https://github.com/testorg/uspark-${testProjectId}`,
            clone_url: `https://github.com/testorg/uspark-${testProjectId}.git`,
          },
        }),
      } as unknown as Octokit;
      vi.mocked(createInstallationOctokit).mockResolvedValue(mockOctokit);

      // Mock installation details to return an organization account
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "Organization",
          login: "testorg",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      // Create repository
      const result = await createProjectRepository(
        testProjectId,
        testInstallationId,
      );

      // Verify result
      expect(result).toEqual({
        repoId: 987654,
        repoName: expectedRepoName,
        fullName: `testorg/uspark-${testProjectId}`,
        url: `https://github.com/testorg/uspark-${testProjectId}`,
        cloneUrl: `https://github.com/testorg/uspark-${testProjectId}.git`,
      });

      // Verify correct API endpoint was called for organization
      expect(mockOctokit.request).toHaveBeenCalledWith(
        "POST /orgs/{org}/repos",
        {
          org: "testorg",
          name: expectedRepoName,
          private: true,
          auto_init: true,
          description: `uSpark sync repository for project ${testProjectId}`,
        },
      );
    });

    it("should throw error if repository already exists", async () => {
      // Create existing repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: expectedRepoName,
        repoId: 111111,
      });

      await expect(
        createProjectRepository(testProjectId, testInstallationId),
      ).rejects.toThrow(
        `Repository already exists for project ${testProjectId}`,
      );
    });
  });

  describe("getProjectRepository", () => {
    it("should return repository info for existing project", async () => {
      // Create repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: expectedRepoName,
        repoId: 987654,
      });

      // Mock getInstallationDetails
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "User",
          login: "testuser",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      const result = await getProjectRepository(testProjectId);

      expect(result).toMatchObject({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: expectedRepoName,
        repoId: 987654,
        accountType: "User",
        fullName: "testuser/uspark-a1b2c3d4",
      });
    });

    it("should return repository info with account type and full name", async () => {
      // Create repository in database
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: expectedRepoName,
        repoId: 987654,
      });

      // Mock getInstallationDetails to return account info
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "Organization",
          login: "test-org",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      const result = await getProjectRepository(testProjectId);

      expect(result).toMatchObject({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: expectedRepoName,
        repoId: 987654,
        accountType: "Organization",
        fullName: "test-org/uspark-a1b2c3d4",
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

      const result = await hasInstallationAccess(
        testUserId,
        testInstallationId,
      );
      expect(result).toBe(true);
    });

    it("should return false for user without access", async () => {
      const result = await hasInstallationAccess(
        testUserId,
        testInstallationId,
      );
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
        repoName: expectedRepoName,
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

  describe("linkExistingRepository", () => {
    it("should link an existing repository to a project", async () => {
      const existingRepoId = 123456;
      const existingRepoName = "my-existing-repo";

      // Mock getInstallationDetails
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "User",
          login: "testuser",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      // Link the existing repository
      const result = await linkExistingRepository(
        testProjectId,
        testInstallationId,
        existingRepoId,
        existingRepoName,
      );

      expect(result).toEqual({
        repoId: existingRepoId,
        repoName: existingRepoName,
        fullName: `testuser/${existingRepoName}`,
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
        repoName: existingRepoName,
        repoId: existingRepoId,
      });
    });

    it("should link repository for organization account", async () => {
      const existingRepoId = 654321;
      const existingRepoName = "org-repo";

      // Mock getInstallationDetails for organization
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "Organization",
          login: "testorg",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      const result = await linkExistingRepository(
        testProjectId,
        testInstallationId,
        existingRepoId,
        existingRepoName,
      );

      expect(result).toEqual({
        repoId: existingRepoId,
        repoName: existingRepoName,
        fullName: `testorg/${existingRepoName}`,
      });
    });

    it("should throw error when repository already exists for project", async () => {
      // Create existing repository link
      const db = globalThis.services.db;
      await db.insert(githubRepos).values({
        projectId: testProjectId,
        installationId: testInstallationId,
        repoName: "existing-repo",
        repoId: 111111,
      });

      // Mock getInstallationDetails
      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "User",
          login: "testuser",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      // Attempt to link another repository
      await expect(
        linkExistingRepository(
          testProjectId,
          testInstallationId,
          222222,
          "another-repo",
        ),
      ).rejects.toThrow(`Repository already exists for project ${testProjectId}`);
    });
  });
});
