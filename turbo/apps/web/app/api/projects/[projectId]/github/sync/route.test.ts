import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
import { eq } from "drizzle-orm";
import "../../../../../../src/test/msw-setup";

// Note: Using real GitHub client with MSW mocking the API endpoints
// Test environment variables are configured in src/test/setup.ts

// Mock auth - this is necessary since we can't authenticate in tests
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock the GitHub authentication to prevent real JWT generation
vi.mock("../../../../../../src/lib/github/auth", () => ({
  getInstallationToken: vi
    .fn()
    .mockResolvedValue("ghs_test_installation_token_12345"),
}));

// Mock getInstallationDetails to avoid real API calls
vi.mock("../../../../../../src/lib/github/client", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../../../src/lib/github/client")
  >("../../../../../../src/lib/github/client");
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

const mockAuth = vi.mocked(auth);

describe("/api/projects/[projectId]/github/sync", () => {
  // Use unique IDs for each test run to avoid conflicts
  const testUserId = `test-user-github-sync-${Date.now()}-${process.pid}`;
  let testInstallationId: number;
  let testCounter = 0;
  const createdProjectIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    testCounter++;
    // Generate unique installation ID for each test using counter + timestamp
    // Keep within PostgreSQL integer limit (max 2,147,483,647)
    const timestamp = Date.now() % 1000000; // Last 6 digits of timestamp
    testInstallationId = 1500000000 + testCounter * 10000000 + timestamp;

    // Set up environment for blob storage
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_id_secret";

    // Initialize real services
    initServices();
  });

  afterEach(async () => {
    // Clean up test data in correct order (child tables first)
    const db = globalThis.services.db;

    // Clean up all projects created during this test
    for (const projectId of createdProjectIds) {
      // Clean up blocks from turns in sessions
      const sessions = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, projectId));

      for (const session of sessions) {
        const turns = await db
          .select()
          .from(TURNS_TBL)
          .where(eq(TURNS_TBL.sessionId, session.id));

        for (const turn of turns) {
          await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, turn.id));
        }

        await db.delete(TURNS_TBL).where(eq(TURNS_TBL.sessionId, session.id));
      }

      await db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, projectId));
      await db
        .delete(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.projectId, projectId));
      await db
        .delete(AGENT_SESSIONS_TBL)
        .where(eq(AGENT_SESSIONS_TBL.projectId, projectId));
      await db.delete(githubRepos).where(eq(githubRepos.projectId, projectId));
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
    }

    // Clear the array for next test
    createdProjectIds.length = 0;
  });

  describe("POST - Sync to GitHub", () => {
    it("should sync project successfully when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
        ReturnType<typeof auth>
      >);

      const projectId = `sync-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      createdProjectIds.push(projectId);
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
        userId: testUserId,
        ydocData,
        version: 0,
      });

      await db.insert(githubRepos).values({
        projectId,
        installationId: testInstallationId,
        repoName: "test-repo",
        repoId: 67890,
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/github/sync`,
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.commitSha).toBe("new-commit-sha-202");
      expect(data.filesCount).toBe(1);
      expect(data.message).toContain("Successfully synced");
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost/api/projects/any-project/github/sync`,
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "any-project" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });

    it("should return 404 when project not found", async () => {
      mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
        ReturnType<typeof auth>
      >);

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
      mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
        ReturnType<typeof auth>
      >);

      const projectId = `no_repo-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      createdProjectIds.push(projectId);
      const db = globalThis.services.db;

      // Create project without repository link
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: testUserId,
        ydocData,
        version: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/github/sync`,
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ projectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("repository_not_linked");
    });
  });

  describe("GET - Sync Status", () => {
    it("should return sync status when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
        ReturnType<typeof auth>
      >);

      const projectId = `status-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      createdProjectIds.push(projectId);
      const db = globalThis.services.db;

      // Insert test repository link
      const insertResult = await db
        .insert(githubRepos)
        .values({
          projectId,
          installationId: testInstallationId,
          repoName: "test-repo",
          repoId: 67890,
        })
        .returning();

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/github/sync`,
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ projectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(true);
      expect(data.repoId).toBe(67890);
      expect(data.repoName).toBe("test-repo");
      expect(data.lastSynced).toBe(insertResult[0]!.updatedAt.toISOString());
    });

    it("should return unlinked status when repository not linked", async () => {
      mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
        ReturnType<typeof auth>
      >);

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
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost/api/projects/any-project/github/sync`,
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "any-project" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });
  });
});
