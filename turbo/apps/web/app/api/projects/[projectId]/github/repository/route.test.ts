import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";
import { auth } from "@clerk/nextjs/server";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
  removeRepositoryLink,
} from "../../../../../../src/lib/github/repository";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock repository functions
vi.mock("../../../../../../src/lib/github/repository", () => ({
  createProjectRepository: vi.fn(),
  getProjectRepository: vi.fn(),
  hasInstallationAccess: vi.fn(),
  removeRepositoryLink: vi.fn(),
}));

describe("/api/projects/[projectId]/github/repository", () => {
  const projectId = "test-project-123";
  const userId = "user_123";
  const installationId = 12345;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return repository info for existing project", async () => {
      const mockRepository = {
        id: "repo-id",
        projectId,
        installationId,
        repoName: "uspark-test-project-123",
        repoId: 987654,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(getProjectRepository).mockResolvedValue(mockRepository);
      vi.mocked(hasInstallationAccess).mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repository.id).toBe(mockRepository.id);
      expect(data.repository.projectId).toBe(mockRepository.projectId);
      expect(data.repository.repoName).toBe(mockRepository.repoName);
      expect(getProjectRepository).toHaveBeenCalledWith(projectId);
      expect(hasInstallationAccess).toHaveBeenCalledWith(
        userId,
        installationId,
      );
    });

    it("should return 404 for non-existent repository", async () => {
      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(getProjectRepository).mockResolvedValue(null);

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
      const mockRepository = {
        repoId: 987654,
        repoName: "uspark-test-project-123",
        fullName: "testuser/uspark-test-project-123",
        url: "https://github.com/testuser/uspark-test-project-123",
        cloneUrl: "https://github.com/testuser/uspark-test-project-123.git",
      };

      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(hasInstallationAccess).mockResolvedValue(true);
      vi.mocked(createProjectRepository).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({ installationId }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ repository: mockRepository });
      expect(hasInstallationAccess).toHaveBeenCalledWith(
        userId,
        installationId,
      );
      expect(createProjectRepository).toHaveBeenCalledWith(
        projectId,
        installationId,
      );
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

      vi.mocked(hasInstallationAccess).mockResolvedValue(true);
      vi.mocked(createProjectRepository).mockRejectedValue(
        new Error("Repository already exists for project test-project-123"),
      );

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "POST",
          body: JSON.stringify({ installationId }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({ error: "repository_already_exists" });
    });
  });

  describe("DELETE", () => {
    it("should remove repository link successfully", async () => {
      const mockRepository = {
        id: "repo-id",
        projectId,
        installationId,
        repoName: "uspark-test-project-123",
        repoId: 987654,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(getProjectRepository).mockResolvedValue(mockRepository);
      vi.mocked(hasInstallationAccess).mockResolvedValue(true);
      vi.mocked(removeRepositoryLink).mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "DELETE",
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: "repository_link_removed" });
      expect(removeRepositoryLink).toHaveBeenCalledWith(projectId);
    });

    it("should return 404 if repository not found during delete", async () => {
      const mockRepository = {
        id: "repo-id",
        projectId,
        installationId,
        repoName: "uspark-test-project-123",
        repoId: 987654,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(getProjectRepository).mockResolvedValue(mockRepository);
      vi.mocked(hasInstallationAccess).mockResolvedValue(true);
      vi.mocked(removeRepositoryLink).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/projects/test-project-123/github/repository",
        {
          method: "DELETE",
        },
      );
      const context = { params: Promise.resolve({ projectId }) };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "repository_not_found" });
    });
  });
});
