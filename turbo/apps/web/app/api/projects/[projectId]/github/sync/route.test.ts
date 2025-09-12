import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "./route";
import { NextRequest } from "next/server";
import { initServices } from "../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { githubRepos } from "../../../../../../src/db/schema/github";
import { SESSIONS_TBL, TURNS_TBL, BLOCKS_TBL } from "../../../../../../src/db/schema/sessions";
import { SHARE_LINKS_TBL } from "../../../../../../src/db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../../../../../src/db/schema/agent-sessions";
import * as Y from "yjs";
import { auth } from "@clerk/nextjs/server";
import "../../../../../../src/test/msw-setup";

// Set up test environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock_instance.clerk.accounts.dev$";
process.env.CLERK_SECRET_KEY = "sk_test_mock_secret_key_for_testing";
process.env.GH_APP_ID = "12345";
process.env.GH_APP_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDShp+5q/tVHTep
zgJ0c7L/dLvXwDuZvGuAOzeqrE5AngDJxXEOdfZCYLcblWk0cfnxiW/OSzSYQEW4
8AflqvV3BEhAh3Z1kPL17vhJ8cd+lazvhtjCxtBxownhVVJuTpl6q8VR2/TDL8kO
GF+leByDh+EHOb327Ou1HOdzcWiMuCSztYEobtKRKGddcNFyPdBp4Dm2yI+7gLz4
jksui++OC3Mepa5ic4tfy52mUvL+g7VFXk6A4JQ0vl6mwi+Q00dv6bDCBbnFpytS
LVM1iNWNamJJIh34xhflnCOV5pYtTrmq3ydh08TVqbj5+H+XME6y3zgV1pUo3YEs
fOIpMBpxAgMBAAECggEABAUSy/FtHEIRb+Y5fQaACJlupEcdBDmZLmLDFHjTii+S
KYgh+WIWfIw69tV+o6QY/wwOJNjiBVW11xsLNY8S/o2oAQZtJD/LKdfBKS1LDz9V
pOG05hw0evT/YWx3BVjuHI3m18IszWTOUJz1x5OwbLEFopUPS+WYdxX5E+balZQ+
LgELN4buz2dsvwUEw3Upd7ywQka6YwqITfJPw911adPYXh+LTN2vvOHI0+V4iHMo
7cTitpWh2iFz/Bxg7auAELd8umCh/WWea2uKeDYyOX5XlSSKJ7LzEiUgLTgqXKkK
vXa1fvcmEOFh1wNQ8vpE3m7cOg9/C3aemLdJAbzUQQKBgQDjE9Sp6yVIe6c5pvBx
E/0/SXrPNhf/GCiLxuIpmnO3vhAaBgkMoLeiwj9LqvNYE1miZGdaSuAcyL9YAJ6q
sibyAqFtDg2Sr7q7EmMWIUaXJLURAgkxHyrf6sZqTWJ5wDoFNRNMonJOWP+h21jJ
3BJ0OEfQbheZQ6CaEhxBlwe8EQKBgQDtVxstGGHKDAvMbF2XiBPU1gBOQMNADqKP
qSvr8Zc6SRak+W6kyurCur8jyabc4ntKDUR90b2VXSc6FiVaJ6TySp8ktkYSXcis
5c+HaoEcy1nU0pEg98J+NNfBPgNDaF6nUKaawbQn5g6EYlTyC8bdH2F+BXJmdjJh
ZVPFKNxYYQKBgG+n050Ni9KdQrfdd0MS4iaZWfLDlX8QgPdh/tkYIihKI564MwDr
kgBM5VSupWM8eImaNxu1z4c3yqZZ/6rNWMsNMhTuoQvsrrPHscMy74PoP8QyLRTj
T3C0/4VLsc1OEPl4hJndErmll2Ud9wWi2cwd1GoPiDkLgM/hcdVqjxoRAoGAAgcs
hEYhD8jqkOScKB9RjBAIEKMdB/8YBII9jdaSpDzbpK089MuHFgLifzvJ4TlONGPI
ogqYxB33p9domkycbDWXBolIL//9Jv0PuOiAEe7q5ZanBtEXKFzrOwt8m6bYqDVY
NxpQn8aneRod/7N6D4mlG56QS6/W3l4vSRAAUgECgYAaAE1RChryBHRdGsnnc/Gt
GL8bqUgDn6oIiscypydnab8j5pKkpX2YQMxSlUf1+9qiFPUgG1gYoXaB9DNt3+23
emzAUSiA6DjVoP+Wl7lo4Ml0xlOMbD2OE51yY5RU5eH6uSD/xLfofetZzT8uymZt
90I2w/9AOnBG+Taccei8cw==
-----END PRIVATE KEY-----`;
process.env.GH_WEBHOOK_SECRET = "test_github_webhook_secret";

// Note: Using real GitHub client with MSW mocking the API endpoints

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
      mockAuth.mockResolvedValue({ userId: "user_123" } as any);

      const projectId = "proj_123";
      const db = globalThis.services.db;

      // Create YDoc with test files
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");
      filesMap.set("README.md", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { size: 100 });
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

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

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "POST",
      });

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
      mockAuth.mockResolvedValue({ userId: null } as any);

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

    it("should return 404 when project not found", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" } as any);

      const request = new NextRequest("http://localhost/api/projects/nonexistent/github/sync", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("project_not_found");
    });

    it("should return 400 when repository not linked", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" } as any);

      const projectId = "proj_123";
      const db = globalThis.services.db;

      // Create project without repository link
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId: "user_123",
        ydocData,
        version: 0,
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
  });

  describe("GET - Sync Status", () => {
    it("should return sync status when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" } as any);

      const projectId = "proj_123";
      const db = globalThis.services.db;

      // Insert test repository link
      const insertResult = await db.insert(githubRepos).values({
        projectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      }).returning();

      const request = new NextRequest("http://localhost/api/projects/proj_123/github/sync", {
        method: "GET",
      });

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
      mockAuth.mockResolvedValue({ userId: "user_123" } as any);

      const request = new NextRequest("http://localhost/api/projects/nonexistent/github/sync", {
        method: "GET",
      });

      const response = await GET(request, {
        params: Promise.resolve({ projectId: "nonexistent" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.linked).toBe(false);
      expect(data.message).toBe("No GitHub repository linked");
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);

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