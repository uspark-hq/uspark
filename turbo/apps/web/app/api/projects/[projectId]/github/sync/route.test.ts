import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "./route";
import { NextRequest } from "next/server";
import { initServices } from "../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { githubRepos } from "../../../../../../src/db/schema/github";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../src/db/schema/sessions";
import { SHARE_LINKS_TBL } from "../../../../../../src/db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../../../../../src/db/schema/agent-sessions";
import * as Y from "yjs";
import { auth } from "@clerk/nextjs/server";
import "../../../../../../src/test/msw-setup";

// Note: Using real GitHub client with MSW mocking the API endpoints
// Test environment variables are configured in src/test/setup.ts

// Mock auth - this is necessary since we can't authenticate in tests
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("/api/projects/[projectId]/github/sync", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up environment for blob storage
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";

    // Initialize real services
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

  describe("POST - Sync to GitHub", () => {
    it("should sync project successfully when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });

      const projectId = "proj_123";
      const db = globalThis.services.db;

      // Create YDoc with test files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");
      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      // Insert test data into real database
      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: "user_123",
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/proj_123/github/sync",
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.commitSha).toBe("new-commit-sha-202");
      expect(data.filesCount).toBe(1);
      expect(data.message).toContain("Successfully synced");
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest(
        "http://localhost/api/projects/proj_123/github/sync",
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });

    it("should return 404 when project not found", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });

      const request = new NextRequest(
        "http://localhost/api/projects/nonexistent/github/sync",
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("project_not_found");
    });

    it("should return 400 when repository not linked", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });

      const projectId = "proj_123";
      const db = globalThis.services.db;

      // Create project without repository link
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: "user_123",
        ydocData,
        version: 0,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/proj_123/github/sync",
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("repository_not_linked");
    });
  });

  describe("GET - Sync Status", () => {
    it("should return sync status when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });

      const projectId = "proj_123";
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

      const request = new NextRequest(
        "http://localhost/api/projects/proj_123/github/sync",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(true);
      expect(data.repoId).toBe(67890);
      expect(data.repoName).toBe("test-repo");
      expect(data.lastSynced).toBe(insertResult[0]!.updatedAt.toISOString());
    });

    it("should return unlinked status when repository not linked", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });

      const request = new NextRequest(
        "http://localhost/api/projects/nonexistent/github/sync",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "nonexistent" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(false);
      expect(data.message).toBe("No GitHub repository linked");
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest(
        "http://localhost/api/projects/proj_123/github/sync",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "proj_123" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });
  });
});
