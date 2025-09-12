import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "./route";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock sync functions
vi.mock("../../../../../../src/lib/github/sync", () => ({
  syncProjectToGitHub: vi.fn(),
  getSyncStatus: vi.fn(),
}));


describe("/api/projects/[projectId]/github/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST - Sync to GitHub", () => {
    it("should sync project successfully when authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { syncProjectToGitHub } = await import("../../../../../../src/lib/github/sync");
      (syncProjectToGitHub as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        commitSha: "abc123",
        filesCount: 5,
        message: "Successfully synced 5 files to GitHub",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.commitSha).toBe("abc123");
      expect(data.filesCount).toBe(5);
      expect(data.message).toContain("Successfully synced");

      expect(syncProjectToGitHub).toHaveBeenCalledWith("proj_123", "user_123");
    });

    it("should return 401 when not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });

    it("should return 403 when user is not authorized for project", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { syncProjectToGitHub } = await import("../../../../../../src/lib/github/sync");
      (syncProjectToGitHub as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Unauthorized",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });

    it("should return 404 when project not found", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { syncProjectToGitHub } = await import("../../../../../../src/lib/github/sync");
      (syncProjectToGitHub as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Project not found",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("project_not_found");
    });

    it("should return 400 when repository not linked", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { syncProjectToGitHub } = await import("../../../../../../src/lib/github/sync");
      (syncProjectToGitHub as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Repository not linked to project",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("repository_not_linked");
    });

    it("should return 500 for other sync errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { syncProjectToGitHub } = await import("../../../../../../src/lib/github/sync");
      (syncProjectToGitHub as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Network error",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("sync_failed");
      expect(data.message).toBe("Network error");
    });
  });

  describe("GET - Sync Status", () => {
    it("should return sync status when authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { getSyncStatus } = await import("../../../../../../src/lib/github/sync");
      (getSyncStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        linked: true,
        repoId: 12345,
        repoName: "test-repo",
        lastSynced: new Date("2025-01-12T10:00:00Z"),
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(true);
      expect(data.repoId).toBe(12345);
      expect(data.repoName).toBe("test-repo");
      expect(data.lastSynced).toBe("2025-01-12T10:00:00.000Z");

      expect(getSyncStatus).toHaveBeenCalledWith("proj_123");
    });

    it("should return unlinked status when repository not linked", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user_123" });

      const { getSyncStatus } = await import("../../../../../../src/lib/github/sync");
      (getSyncStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        linked: false,
        message: "No GitHub repository linked",
      });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(false);
      expect(data.message).toBe("No GitHub repository linked");
    });

    it("should return 401 when not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });
  });
});