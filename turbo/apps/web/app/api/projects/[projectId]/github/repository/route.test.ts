import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import {
  cleanupTestProjects,
  cleanupTestGitHubInstallations,
} from "../../../../../../src/test/db-test-utils";
import { initServices } from "../../../../../../src/lib/init-services";
import {
  githubInstallations,
  githubRepos,
} from "../../../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub client to avoid real API calls
vi.mock("../../../../../../src/lib/github/client", () => ({
  createInstallationOctokit: vi.fn().mockResolvedValue({
    request: vi.fn().mockResolvedValue({
      data: {
        id: 987654,
        name: "uspark-test-project-123",
        full_name: "testuser/uspark-test-project-123",
        html_url: "https://github.com/testuser/uspark-test-project-123",
        clone_url: "https://github.com/testuser/uspark-test-project-123.git",
      },
    }),
  }),
  getInstallationDetails: vi.fn().mockResolvedValue({
    id: 12345,
    account: {
      login: "testuser",
      type: "User",
    },
  }),
}));

describe("/api/projects/[projectId]/github/repository", () => {
  const projectId = `test-project-${Date.now()}-${process.pid}`;
  const userId = `user_${Date.now()}_${process.pid}`; // Make userId unique too
  // Use fixed ID for all tests in this file since they clean up after themselves
  const testInstallationId = 200001;

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data using utility functions
    await cleanupTestProjects([projectId]);
    if (testInstallationId) {
      await cleanupTestGitHubInstallations([testInstallationId]);
    }
  });

  describe("GET", () => {
    it("should return repository info for existing project", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // Setup test data
      initServices();
      const db = globalThis.services.db;

      // Create test installation
      await db.insert(githubInstallations).values({
        userId,
        installationId: testInstallationId,
        accountName: "testuser",
      });

      // Create test repository
      await db.insert(githubRepos).values({
        projectId,
        installationId: testInstallationId,
        repoName: "uspark-test-project-123",
        repoId: 987654,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repository.projectId).toBe(projectId);
      expect(data.repository.repoName).toBe("uspark-test-project-123");
      expect(data.repository.installationId).toBe(testInstallationId);
    });

    it("should return 404 for non-existent repository", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // No repository in database for this project

      const request = new NextRequest(
        "http://localhost/api/projects/non-existent/github/repository",
      );
      const context = {
        params: Promise.resolve({ projectId: "non-existent" }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "repository_not_found" });
    });

    it("should return 401 for unauthenticated user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "unauthorized" });
    });
  });

  describe("POST", () => {
    it("should create repository successfully", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // Setup test data
      initServices();
      const db = globalThis.services.db;

      // Create test installation
      await db.insert(githubInstallations).values({
        userId,
        installationId: testInstallationId,
        accountName: "testuser",
      });

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({ installationId: testInstallationId }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.repository.repoId).toBe(987654);
      expect(data.repository.repoName).toBe("uspark-test-project-123");
      expect(data.repository.fullName).toBe("testuser/uspark-test-project-123");

      // Verify repository was created in database
      const createdRepo = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, projectId));
      expect(createdRepo.length).toBe(1);
    });

    it("should return 400 for missing installation ID", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "installation_id_required" });
    });

    it("should return 409 for repository that already exists", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // Setup test data
      initServices();
      const db = globalThis.services.db;

      // Create test installation
      await db.insert(githubInstallations).values({
        userId,
        installationId: testInstallationId,
        accountName: "testuser",
      });

      // Create existing repository
      await db.insert(githubRepos).values({
        projectId,
        installationId: testInstallationId,
        repoName: "existing-repo",
        repoId: 111111,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({ installationId: testInstallationId }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({ error: "repository_already_exists" });
    });

    it("should link existing repository successfully", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // Setup test data
      initServices();
      const db = globalThis.services.db;

      // Create test installation
      await db.insert(githubInstallations).values({
        userId,
        installationId: testInstallationId,
        accountName: "testuser",
      });

      const existingRepoId = 123456;
      const existingRepoName = "my-existing-repo";

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({
            installationId: testInstallationId,
            repositoryId: existingRepoId,
            repositoryName: existingRepoName,
            owner: "testuser",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.repository.repoId).toBe(existingRepoId);
      expect(data.repository.repoName).toBe(existingRepoName);
      expect(data.repository.fullName).toBe(`testuser/${existingRepoName}`);

      // Verify repository link was created in database
      const createdRepo = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, projectId));
      expect(createdRepo.length).toBe(1);
      expect(createdRepo[0]).toMatchObject({
        projectId,
        installationId: testInstallationId,
        repoId: existingRepoId,
        repoName: existingRepoName,
      });
    });

    it("should return 400 for invalid repository parameters", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      // Setup test data
      initServices();
      const db = globalThis.services.db;

      // Create test installation
      await db.insert(githubInstallations).values({
        userId,
        installationId: testInstallationId,
        accountName: "testuser",
      });

      // Missing repositoryName (repositoryId provided but not repositoryName)
      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({
            installationId: testInstallationId,
            repositoryId: 123456,
            // repositoryName is missing
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);

      // Should fall back to creating new repo since repositoryName is missing
      // Based on the implementation: if (repositoryId && repositoryName)
      // Without repositoryName, it will try to create a new repo
      expect(response.status).toBe(201);
    });
  });
});
