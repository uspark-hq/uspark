import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { initServices } from "../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { GITHUB_REPO_STATS_TBL } from "../../../../src/db/schema/github-repo-stats";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import "../../../../src/test/setup";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub repository functions
vi.mock("../../../../src/lib/github/repository", () => ({
  getRepositoryDetails: vi.fn(),
  RepositoryFetchError: class RepositoryFetchError extends Error {
    constructor(
      message: string,
      public readonly repoUrl: string,
      public readonly statusCode?: number,
      public readonly cause?: unknown,
    ) {
      super(message);
      this.name = "RepositoryFetchError";
    }
  },
}));

import { auth } from "@clerk/nextjs/server";
import {
  getRepositoryDetails,
  RepositoryFetchError,
} from "../../../../src/lib/github/repository";

const mockAuth = vi.mocked(auth);
const mockGetRepositoryDetails = vi.mocked(getRepositoryDetails);

describe("/api/github/repo-stats", () => {
  const userId = `test-user-repo-stats-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];

  // Helper to call the API
  async function callApi(queryParams: string) {
    const url = `http://localhost:3000/api/github/repo-stats${queryParams}`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : null;
    return { status: response.status, data };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Clean up previous test data
    initServices();
    const db = globalThis.services.db;

    // Clean up repo stats
    await db.delete(GITHUB_REPO_STATS_TBL);

    // Clean up projects
    const oldProjects = await db
      .select({ id: PROJECTS_TBL.id })
      .from(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));

    for (const project of oldProjects) {
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, project.id));
    }

    createdProjectIds.length = 0;
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await callApi("?repoUrl=owner/repo");

      expect(response.status).toBe(401);
      expect(response.data.error).toBe("Unauthorized");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 if repoUrl is missing", async () => {
      const response = await callApi("");

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("repoUrl parameter is required");
    });

    it("should accept valid repoUrl parameter", async () => {
      mockGetRepositoryDetails.mockResolvedValueOnce({
        id: 123,
        name: "test-repo",
        fullName: "owner/test-repo",
        stargazersCount: 42,
        url: "https://github.com/owner/test-repo",
        private: false,
      });

      const response = await callApi("?repoUrl=owner/test-repo");

      expect(response.status).toBe(200);
      expect(response.data.repoUrl).toBe("owner/test-repo");
      expect(response.data.stargazersCount).toBe(42);
    });

    it("should accept optional installationId parameter", async () => {
      mockGetRepositoryDetails.mockResolvedValueOnce({
        id: 456,
        name: "private-repo",
        fullName: "owner/private-repo",
        stargazersCount: 10,
        url: "https://github.com/owner/private-repo",
        private: true,
      });

      const response = await callApi(
        "?repoUrl=owner/private-repo&installationId=789",
      );

      expect(response.status).toBe(200);
      expect(mockGetRepositoryDetails).toHaveBeenCalledWith(
        "owner/private-repo",
        789,
      );
    });
  });

  describe("Cache Behavior", () => {
    it("should cache repository stats for 1 hour", async () => {
      mockGetRepositoryDetails.mockResolvedValueOnce({
        id: 123,
        name: "cached-repo",
        fullName: "owner/cached-repo",
        stargazersCount: 100,
        url: "https://github.com/owner/cached-repo",
        private: false,
      });

      // First request - should fetch from GitHub
      const response1 = await callApi("?repoUrl=owner/cached-repo");

      expect(response1.status).toBe(200);
      expect(response1.data.stargazersCount).toBe(100);
      expect(response1.data.cached).toBe(false);
      expect(mockGetRepositoryDetails).toHaveBeenCalledTimes(1);

      // Second request immediately after - should use cache
      const response2 = await callApi("?repoUrl=owner/cached-repo");

      expect(response2.status).toBe(200);
      expect(response2.data.stargazersCount).toBe(100);
      expect(response2.data.cached).toBe(true);
      expect(mockGetRepositoryDetails).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it("should refresh cache after 1 hour", async () => {
      initServices();
      const db = globalThis.services.db;

      // Insert old cached data (2 hours ago)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await db.insert(GITHUB_REPO_STATS_TBL).values({
        repoUrl: "owner/stale-repo",
        stargazersCount: 50,
        forksCount: 0,
        openIssuesCount: null,
        installationId: null,
        lastFetchedAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      });

      // Mock fresh data with updated star count
      mockGetRepositoryDetails.mockResolvedValueOnce({
        id: 123,
        name: "stale-repo",
        fullName: "owner/stale-repo",
        stargazersCount: 150, // Updated count
        url: "https://github.com/owner/stale-repo",
        private: false,
      });

      const response = await callApi("?repoUrl=owner/stale-repo");

      expect(response.status).toBe(200);
      expect(response.data.stargazersCount).toBe(150); // Fresh data
      expect(response.data.cached).toBe(false);
      expect(mockGetRepositoryDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 if repository is not found", async () => {
      mockGetRepositoryDetails.mockRejectedValueOnce(
        new RepositoryFetchError(
          "Repository not found: owner/nonexistent",
          "owner/nonexistent",
          404,
        ),
      );

      const response = await callApi("?repoUrl=owner/nonexistent");

      expect(response.status).toBe(404);
      expect(response.data.error).toContain("not found");
      expect(response.data.repoUrl).toBe("owner/nonexistent");
    });

    it("should return 403 if access is denied", async () => {
      mockGetRepositoryDetails.mockRejectedValueOnce(
        new RepositoryFetchError(
          "Access denied to repository: owner/private",
          "owner/private",
          403,
        ),
      );

      const response = await callApi("?repoUrl=owner/private");

      expect(response.status).toBe(403);
      expect(response.data.error).toContain("Access denied");
    });

    it("should return 500 for unknown errors", async () => {
      mockGetRepositoryDetails.mockRejectedValueOnce(
        new RepositoryFetchError(
          "Failed to fetch repository details for: owner/error-repo",
          "owner/error-repo",
          undefined,
          new Error("Network error"),
        ),
      );

      const response = await callApi("?repoUrl=owner/error-repo");

      expect(response.status).toBe(500);
      expect(response.data.error).toContain("Failed to fetch");
    });
  });

  describe("Database Operations", () => {
    it("should upsert repository stats on conflict", async () => {
      initServices();
      const db = globalThis.services.db;

      // Insert initial data
      await db.insert(GITHUB_REPO_STATS_TBL).values({
        repoUrl: "owner/upsert-test",
        stargazersCount: 10,
        forksCount: 0,
        openIssuesCount: null,
        installationId: null,
        lastFetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(),
      });

      // Mock updated data
      mockGetRepositoryDetails.mockResolvedValueOnce({
        id: 123,
        name: "upsert-test",
        fullName: "owner/upsert-test",
        stargazersCount: 20, // Updated
        url: "https://github.com/owner/upsert-test",
        private: false,
      });

      const response = await callApi("?repoUrl=owner/upsert-test");

      expect(response.status).toBe(200);
      expect(response.data.stargazersCount).toBe(20);

      // Verify database was updated
      const cached = await db
        .select()
        .from(GITHUB_REPO_STATS_TBL)
        .where(eq(GITHUB_REPO_STATS_TBL.repoUrl, "owner/upsert-test"));

      expect(cached).toHaveLength(1);
      expect(cached[0]!.stargazersCount).toBe(20);
    });
  });
});
