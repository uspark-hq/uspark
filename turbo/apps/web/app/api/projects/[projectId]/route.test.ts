import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { POST as createProject } from "../route";
import { POST as createSession } from "./sessions/route";
import { POST as createShare } from "../../share/route";
import * as Y from "yjs";
import { initServices } from "../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { SESSIONS_TBL } from "../../../../src/db/schema/sessions";
import { githubRepos } from "../../../../src/db/schema/github";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../../../src/db/schema/agent-sessions";
import { eq, and } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock next/headers - needs to be hoisted before imports
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId", () => {
  const projectId = `test-project-${Date.now()}`;
  const userId = `test-user-${Date.now()}-${process.pid}`;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Clean up any existing test project
    initServices();
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("GET /api/projects/:projectId", () => {
    it("should create new project with empty YDoc when project doesn't exist", async () => {
      const mockRequest = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(mockRequest, context);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/octet-stream",
      );
      expect(response.headers.get("X-Version")).toBe("0");

      // Verify the response is a valid YDoc
      const binaryData = await response.arrayBuffer();
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(binaryData));

      const files = ydoc.getMap("files");
      expect(files.size).toBe(0);

      // Verify project was created in database
      const [storedProject] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(
          and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
        );

      expect(storedProject).toBeDefined();
      expect(storedProject?.version).toBe(0);
    });

    it("should return existing project YDoc", async () => {
      // Create a project using API endpoint first
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: `test-project-existing-${Date.now()}` }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Now update the project's data directly (simulating previous edits)
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set("test.md", { hash: "abc123", mtime: Date.now() });

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data, version: 3 })
        .where(eq(PROJECTS_TBL.id, testProjectId));

      // Make GET request
      const mockRequest = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId: testProjectId }) };

      const response = await GET(mockRequest, context);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Version")).toBe("3");

      // Verify the response contains our data
      const binaryData = await response.arrayBuffer();
      const responseDoc = new Y.Doc();
      Y.applyUpdate(responseDoc, new Uint8Array(binaryData));

      const responseFiles = responseDoc.getMap("files");
      expect(responseFiles.size).toBe(1);
      expect(responseFiles.get("test.md")).toHaveProperty("hash", "abc123");
    });
  });

  describe("PATCH /api/projects/:projectId", () => {
    it("should apply YDoc updates to existing project", async () => {
      // Create initial project using API endpoint
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: `test-project-update-${Date.now()}` }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Get the initial state for updates
      const getRequest = new NextRequest("http://localhost:3000");
      const getContext = {
        params: Promise.resolve({ projectId: testProjectId }),
      };
      const getResponse = await GET(getRequest, getContext);
      const initialState = await getResponse.arrayBuffer();

      // Create an update
      const clientDoc = new Y.Doc();
      Y.applyUpdate(clientDoc, new Uint8Array(initialState));
      const stateVector = Y.encodeStateVector(clientDoc);

      const files = clientDoc.getMap("files");
      files.set("newfile.ts", { hash: "xyz789", mtime: Date.now() });

      const update = Y.encodeStateAsUpdate(clientDoc, stateVector);

      // Send PATCH request
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Version": "0",
        },
      });
      const context = { params: Promise.resolve({ projectId: testProjectId }) };

      const response = await PATCH(mockRequest, context);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Version")).toBe("1");

      // Verify the update was applied
      const [updatedProject] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(
          and(
            eq(PROJECTS_TBL.id, testProjectId),
            eq(PROJECTS_TBL.userId, userId),
          ),
        );

      expect(updatedProject?.version).toBe(1);

      // Verify the YDoc content
      const storedDoc = new Y.Doc();
      const storedBinary = Buffer.from(
        updatedProject?.ydocData || "",
        "base64",
      );
      Y.applyUpdate(storedDoc, new Uint8Array(storedBinary));

      const storedFiles = storedDoc.getMap("files");
      expect(storedFiles.size).toBe(1);
      expect(storedFiles.get("newfile.ts")).toHaveProperty("hash", "xyz789");
    });

    it("should return 409 on version conflict", async () => {
      // Create project using API endpoint
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: `test-project-conflict-${Date.now()}` }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Update version directly to simulate version conflict
      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ version: 2 })
        .where(eq(PROJECTS_TBL.id, testProjectId));

      const update = new Uint8Array([1, 2, 3]); // dummy update

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Version": "1", // Wrong version
        },
      });
      const context = { params: Promise.resolve({ projectId: testProjectId }) };

      const response = await PATCH(mockRequest, context);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Version conflict");
      expect(data).toHaveProperty("currentVersion", 2);
    });

    it("should handle concurrent updates with optimistic locking", async () => {
      // Create initial project using API endpoint
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: `test-project-concurrent-${Date.now()}` }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Get the initial state
      const getRequest = new NextRequest("http://localhost:3000");
      const getContext = {
        params: Promise.resolve({ projectId: testProjectId }),
      };
      const getResponse = await GET(getRequest, getContext);
      const state = await getResponse.arrayBuffer();

      // Create two different updates
      const clientDoc1 = new Y.Doc();
      Y.applyUpdate(clientDoc1, new Uint8Array(state));
      const stateVector1 = Y.encodeStateVector(clientDoc1);
      clientDoc1.getMap("files").set("file1.ts", { hash: "hash1", mtime: 1 });
      const update1 = Y.encodeStateAsUpdate(clientDoc1, stateVector1);

      const clientDoc2 = new Y.Doc();
      Y.applyUpdate(clientDoc2, new Uint8Array(state));
      const stateVector2 = Y.encodeStateVector(clientDoc2);
      clientDoc2.getMap("files").set("file2.ts", { hash: "hash2", mtime: 2 });
      const update2 = Y.encodeStateAsUpdate(clientDoc2, stateVector2);

      // Apply first update
      const request1 = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update1),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Version": "0",
        },
      });
      const context1 = {
        params: Promise.resolve({ projectId: testProjectId }),
      };
      const response1 = await PATCH(request1, context1);
      expect(response1.status).toBe(200);

      // Try to apply second update with old version (should fail)
      const request2 = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update2),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Version": "0", // Old version
        },
      });
      const context2 = {
        params: Promise.resolve({ projectId: testProjectId }),
      };
      const response2 = await PATCH(request2, context2);

      expect(response2.status).toBe(409);
      const error = await response2.json();
      expect(error).toHaveProperty("error", "Version conflict");
    });
  });

  describe("DELETE /api/projects/:projectId", () => {
    it("should delete project and all related data", async () => {
      // Create project using API endpoint
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: "test-project-to-delete" }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Create related data
      // 1. Create session using API
      const createSessionRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Test Session" }),
      });
      const sessionContext = {
        params: Promise.resolve({ projectId: testProjectId }),
      };
      const sessionResponse = await createSession(
        createSessionRequest,
        sessionContext,
      );
      expect(sessionResponse.status).toBe(200);

      // 2. Create GitHub repo link (keep direct DB - no API available)
      await globalThis.services.db.insert(githubRepos).values({
        id: `github-${testProjectId}`,
        projectId: testProjectId,
        installationId: 12345,
        repoName: "test-repo",
        repoId: 67890,
      });

      // 3. Create share link using API
      const createShareRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({
          project_id: testProjectId,
          file_path: "test.md",
        }),
      });
      const shareResponse = await createShare(createShareRequest);
      expect(shareResponse.status).toBe(200);

      // 4. Create agent session
      await globalThis.services.db.insert(AGENT_SESSIONS_TBL).values({
        id: `agent-${testProjectId}`,
        projectId: testProjectId,
        userId: userId,
        prompt: "Test prompt",
        status: "completed",
      });

      // Verify all data exists before deletion
      const [projectBefore] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));
      expect(projectBefore).toBeDefined();

      const [sessionBefore] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, testProjectId));
      expect(sessionBefore).toBeDefined();

      const [githubRepoBefore] = await globalThis.services.db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, testProjectId));
      expect(githubRepoBefore).toBeDefined();

      const [shareLinkBefore] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.projectId, testProjectId));
      expect(shareLinkBefore).toBeDefined();

      const [agentSessionBefore] = await globalThis.services.db
        .select()
        .from(AGENT_SESSIONS_TBL)
        .where(eq(AGENT_SESSIONS_TBL.projectId, testProjectId));
      expect(agentSessionBefore).toBeDefined();

      // Delete the project
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ projectId: testProjectId }) };

      const response = await DELETE(mockRequest, context);

      expect(response.status).toBe(204);

      // Verify all data was deleted
      const [projectAfter] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));
      expect(projectAfter).toBeUndefined();

      const [sessionAfter] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, testProjectId));
      expect(sessionAfter).toBeUndefined();

      const [githubRepoAfter] = await globalThis.services.db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.projectId, testProjectId));
      expect(githubRepoAfter).toBeUndefined();

      const [shareLinkAfter] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.projectId, testProjectId));
      expect(shareLinkAfter).toBeUndefined();

      const [agentSessionAfter] = await globalThis.services.db
        .select()
        .from(AGENT_SESSIONS_TBL)
        .where(eq(AGENT_SESSIONS_TBL.projectId, testProjectId));
      expect(agentSessionAfter).toBeUndefined();
    });

    it("should successfully delete project even without related data", async () => {
      // Create project using API endpoint
      const createRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: "test-project-simple" }),
      });
      const createResponse = await createProject(createRequest);
      const createdProject = await createResponse.json();
      const testProjectId = createdProject.id;

      // Delete without creating any related data
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ projectId: testProjectId }) };

      const response = await DELETE(mockRequest, context);

      expect(response.status).toBe(204);

      // Verify project was deleted
      const [projectAfter] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));
      expect(projectAfter).toBeUndefined();
    });
  });
});
