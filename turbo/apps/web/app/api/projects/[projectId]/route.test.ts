import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import * as Y from "yjs";
import { initServices } from "../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

describe("/api/projects/:projectId", () => {
  const projectId = `test-project-${Date.now()}`;
  const userId = "test-user";

  beforeEach(async () => {
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
      expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
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
          and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId))
        );
      
      expect(storedProject).toBeDefined();
      expect(storedProject?.version).toBe(0);
    });

    it("should return existing project YDoc", async () => {
      // Create a project with some data
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set("test.md", { hash: "abc123", mtime: Date.now() });
      
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 3,
      });

      // Make GET request
      const mockRequest = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

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
      // Create initial project
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      // Create an update
      const clientDoc = new Y.Doc();
      Y.applyUpdate(clientDoc, state);
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
      const context = { params: Promise.resolve({ projectId }) };

      const response = await PATCH(mockRequest, context);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Version")).toBe("1");

      // Verify the update was applied
      const [updatedProject] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(
          and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId))
        );

      expect(updatedProject?.version).toBe(1);

      // Verify the YDoc content
      const storedDoc = new Y.Doc();
      const storedBinary = Buffer.from(updatedProject?.ydocData || "", "base64");
      Y.applyUpdate(storedDoc, new Uint8Array(storedBinary));
      
      const storedFiles = storedDoc.getMap("files");
      expect(storedFiles.size).toBe(1);
      expect(storedFiles.get("newfile.ts")).toHaveProperty("hash", "xyz789");
    });

    it("should return 404 when project doesn't exist", async () => {
      const update = new Uint8Array([1, 2, 3]); // dummy update

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update),
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
      const context = { params: Promise.resolve({ projectId: "non-existent" }) };

      const response = await PATCH(mockRequest, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Project not found");
    });

    it("should return 409 on version conflict", async () => {
      // Create project with version 2
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 2,
      });

      const update = new Uint8Array([1, 2, 3]); // dummy update

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Version": "1", // Wrong version
        },
      });
      const context = { params: Promise.resolve({ projectId }) };

      const response = await PATCH(mockRequest, context);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Version conflict");
      expect(data).toHaveProperty("currentVersion", 2);
    });

    it("should handle concurrent updates with optimistic locking", async () => {
      // Create initial project
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      // Create two different updates
      const clientDoc1 = new Y.Doc();
      Y.applyUpdate(clientDoc1, state);
      const stateVector1 = Y.encodeStateVector(clientDoc1);
      clientDoc1.getMap("files").set("file1.ts", { hash: "hash1", mtime: 1 });
      const update1 = Y.encodeStateAsUpdate(clientDoc1, stateVector1);

      const clientDoc2 = new Y.Doc();
      Y.applyUpdate(clientDoc2, state);
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
      const context1 = { params: Promise.resolve({ projectId }) };
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
      const context2 = { params: Promise.resolve({ projectId }) };
      const response2 = await PATCH(request2, context2);
      
      expect(response2.status).toBe(409);
      const error = await response2.json();
      expect(error).toHaveProperty("error", "Version conflict");
    });
  });
});