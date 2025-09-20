import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import * as Y from "yjs";

// Mock dependencies
vi.mock("../../../../../../src/lib/auth/get-user-id", () => ({
  getUserId: vi.fn(),
}));

vi.mock("../../../../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

vi.mock("../../../../../../src/env", () => ({
  env: vi.fn(() => ({ BLOB_READ_WRITE_TOKEN: "test-token" })),
}));

vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: vi
    .fn()
    .mockResolvedValue("client-token"),
}));

describe("/api/projects/[projectId]/files/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock database
    globalThis.services = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      },
    };
  });

  describe("GET", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "unauthorized" });
    });

    it("should return 404 when project is not found", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Mock empty project result
      globalThis.services.db.where = vi.fn().mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "project_not_found" });
    });

    it("should return 404 when project has no files", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Mock project without ydocData
      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData: null },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "no_files_in_project" });
    });

    it("should return 404 when file is not found in YJS document", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Create YJS document with different file
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      filesMap.set("other/file.ts", { hash: "hash123", mtime: Date.now() });
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "file_not_found" });
    });

    it("should return file content from YJS blobs map when available", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Create YJS document with file and blob content
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      filesMap.set("src/test.ts", { hash: "hash123", mtime: Date.now() });
      blobsMap.set("hash123", { content: "console.log('Hello');" });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: "console.log('Hello');",
        hash: "hash123",
      });
    });

    it("should fetch content from Vercel Blob Storage when not in YJS", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Create YJS document with file but no blob content
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      filesMap.set("src/test.ts", { hash: "hash123", mtime: Date.now() });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      // Mock fetch for blob storage
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue("export function test() {}"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: "export function test() {}",
        hash: "hash123",
      });

      // Verify blob storage was called
      expect(global.fetch).toHaveBeenCalledWith(
        "https://blob.vercel-storage.com/files/projects/test-project/hash123",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer client-token",
          },
        }),
      );
    });

    it("should return empty content when blob storage returns 404", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Create YJS document with file but no blob content
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      filesMap.set("src/test.ts", { hash: "hash123", mtime: Date.now() });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      // Mock fetch for blob storage returning 404
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: "",
        hash: "hash123",
      });
    });

    it("should return empty content when blob storage is not configured", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      const { env } = await import("../../../../../../src/env");

      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");
      (env as ReturnType<typeof vi.fn>).mockReturnValue({
        BLOB_READ_WRITE_TOKEN: "",
      });

      // Create YJS document with file
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      filesMap.set("src/test.ts", { hash: "hash123", mtime: Date.now() });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/test.ts",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "test.ts"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: "",
        hash: "hash123",
      });
    });

    it("should handle file paths with multiple segments correctly", async () => {
      const { getUserId } = await import(
        "../../../../../../src/lib/auth/get-user-id"
      );
      (getUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user-123");

      // Create YJS document with nested file path
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      filesMap.set("src/components/Button.tsx", {
        hash: "hash456",
        mtime: Date.now(),
      });
      blobsMap.set("hash456", {
        content: "export const Button = () => <button />;",
      });

      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );

      globalThis.services.db.where = vi
        .fn()
        .mockResolvedValue([
          { id: "test-project", userId: "user-123", ydocData },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/projects/test-project/files/src/components/Button.tsx",
      );
      const context = {
        params: Promise.resolve({
          projectId: "test-project",
          path: ["src", "components", "Button.tsx"],
        }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: "export const Button = () => <button />;",
        hash: "hash456",
      });
    });
  });
});
