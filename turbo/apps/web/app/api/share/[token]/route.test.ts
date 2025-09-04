import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { initServices } from "../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { nanoid } from "nanoid";
import crypto from "crypto";

describe("/api/share/:token", () => {
  const projectId = `test-project-${Date.now()}`;
  const userId = "test-user";
  const testFilePath = "src/test.ts";
  const testToken = crypto.randomBytes(32).toString("base64url");
  const shareId = nanoid();

  beforeEach(async () => {
    // Clean up any existing test data
    initServices();
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.projectId, projectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("GET /api/share/:token", () => {
    beforeEach(async () => {
      // Create a test project with file data
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, { hash: "abc123", mtime: Date.now() });

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      // Create a share link
      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token: testToken,
        projectId,
        filePath: testFilePath,
        userId,
      });
    });

    it("should return 501 for valid share token (blob storage not implemented)", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/share/${testToken}`,
      );
      const context = { params: Promise.resolve({ token: testToken }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(501);
      expect(responseData).toMatchObject({
        error: "blob_storage_not_implemented",
        message: expect.any(String),
        file_info: {
          project_name: projectId,
          file_path: testFilePath,
          hash: "abc123",
          mtime: expect.any(Number),
        },
      });
    });

    it("should return 404 for non-existent token", async () => {
      const invalidToken = "invalid-token-123";
      const request = new NextRequest(
        `http://localhost:3000/api/share/${invalidToken}`,
      );
      const context = { params: Promise.resolve({ token: invalidToken }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "share_not_found",
      });
    });

    it("should return 400 for missing token", async () => {
      const request = new NextRequest("http://localhost:3000/api/share/");
      const context = { params: Promise.resolve({ token: "" }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: "share_not_found",
        error_description: "Invalid or missing token",
      });
    });

    // Note: Testing for deleted project scenarios is complex due to foreign key constraints.
    // In practice, the foreign key constraint prevents orphaned share links.

    it("should return 404 when file is not found in YDoc", async () => {
      // Create project without the shared file
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set("other-file.ts", { hash: "def456", mtime: Date.now() });

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const request = new NextRequest(
        `http://localhost:3000/api/share/${testToken}`,
      );
      const context = { params: Promise.resolve({ token: testToken }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "file_not_found",
      });
    });

    it("should handle YDoc with invalid file node structure", async () => {
      // Create project with malformed file data
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, "invalid-file-node"); // Should be object with hash/mtime

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const request = new NextRequest(
        `http://localhost:3000/api/share/${testToken}`,
      );
      const context = { params: Promise.resolve({ token: testToken }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "file_not_found",
      });
    });

    it("should handle file node without hash", async () => {
      // Create project with file node missing hash
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, { mtime: Date.now() }); // Missing hash

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const request = new NextRequest(
        `http://localhost:3000/api/share/${testToken}`,
      );
      const context = { params: Promise.resolve({ token: testToken }) };

      const response = await GET(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "file_not_found",
      });
    });
  });
});
