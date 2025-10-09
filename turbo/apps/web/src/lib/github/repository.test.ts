import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
  getUserInstallations,
} from "./repository";
import { initServices } from "../init-services";
import { githubInstallations, githubRepos } from "../../db/schema/github";
import { eq } from "drizzle-orm";
import { getInstallationDetails } from "./client";

// Mock the client module - we still need to mock external APIs
vi.mock("./client", () => ({
  getInstallationDetails: vi.fn(),
  createInstallationOctokit: vi.fn(),
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

  describe("createProjectRepository", () => {
    it("should create a new repository for a project", async () => {
      const { createInstallationOctokit } = await import("./client");

      // Mock GitHub API responses
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 123456,
            name: expectedRepoName,
            full_name: `testuser/${expectedRepoName}`,
            html_url: `https://github.com/testuser/${expectedRepoName}`,
            clone_url: `https://github.com/testuser/${expectedRepoName}.git`,
          },
        }),
      };

      vi.mocked(createInstallationOctokit).mockResolvedValue(
        mockOctokit as never,
      );

      vi.mocked(getInstallationDetails).mockResolvedValue({
        account: {
          type: "User",
          login: "testuser",
        },
      } as Awaited<ReturnType<typeof getInstallationDetails>>);

      const result = await createProjectRepository(
        testProjectId,
        testInstallationId,
      );

      expect(result).toEqual({
        repoId: 123456,
        repoName: expectedRepoName,
        fullName: `testuser/${expectedRepoName}`,
        url: `https://github.com/testuser/${expectedRepoName}`,
        cloneUrl: `https://github.com/testuser/${expectedRepoName}.git`,
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
        repoId: 123456,
      });
    });

    it("should throw error when repository already exists for project", async () => {
      // Create existing repository
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
});
