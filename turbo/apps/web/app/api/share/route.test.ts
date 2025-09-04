import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/share", () => {
  const projectId = `test-project-${Date.now()}`;
  const userId = "test-user";
  const testFilePath = "src/test.ts";

  beforeEach(async () => {
    // Clean up any existing test data
    initServices();
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.projectId, projectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({
      userId,
      sessionClaims: {},
      sessionId: "session-123",
      actor: undefined,
    });
  });

  describe("POST /api/share", () => {
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
    });

    it("should create share link for valid request", async () => {
      const requestBody = {
        project_id: projectId,
        file_path: testFilePath,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toMatchObject({
        id: expect.any(String),
        url: expect.stringMatching(/^https?:\/\/.+\/share\/.+/),
        token: expect.any(String),
      });

      // Verify share link was stored in database
      const [shareLink] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.token, responseData.token));

      expect(shareLink).toBeDefined();
      expect(shareLink?.projectId).toBe(projectId);
      expect(shareLink?.filePath).toBe(testFilePath);
      expect(shareLink?.userId).toBe(userId);
    });

    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({
        userId: null,
        sessionClaims: null,
        sessionId: null,
        actor: undefined,
      });

      const requestBody = {
        project_id: projectId,
        file_path: testFilePath,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        error: "unauthorized",
      });
    });

    it("should return 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: "invalid_request",
        error_description: "Invalid JSON in request body",
      });
    });

    it("should return 400 for missing project_id", async () => {
      const requestBody = {
        file_path: testFilePath,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: "invalid_request",
        error_description: expect.stringContaining("project_id"),
      });
    });

    it("should return 400 for missing file_path", async () => {
      const requestBody = {
        project_id: projectId,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: "invalid_request",
        error_description: expect.stringContaining("file_path"),
      });
    });

    it("should return 404 for non-existent project", async () => {
      const requestBody = {
        project_id: "non-existent-project",
        file_path: testFilePath,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "project_not_found",
      });
    });

    it("should return 404 for project owned by different user", async () => {
      // Create project owned by different user
      const otherUserId = "other-user";
      const otherProjectId = `other-project-${Date.now()}`;

      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: otherProjectId,
        userId: otherUserId,
        ydocData: base64Data,
        version: 0,
      });

      const requestBody = {
        project_id: otherProjectId,
        file_path: testFilePath,
      };

      const request = new NextRequest("http://localhost:3000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "project_not_found",
      });

      // Clean up
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });
  });
});
