import { describe, it, beforeEach, expect } from "vitest";
import { NodeFsDocStore } from "../node-fs-doc-store";
import { server, http, HttpResponse } from "@uspark/core/test/msw-setup";
import * as Y from "yjs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("NodeFsDocStore", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("should construct and sync without error", async () => {
    // Setup: Create a temporary directory
    const testDir = path.join(tmpdir(), `node-fs-doc-store-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Setup: Create .config.json
    await fs.writeFile(
      path.join(testDir, ".config.json"),
      JSON.stringify({
        projectId: "my-project",
        version: 0,
      }),
      "utf-8",
    );

    // Setup: Create empty server document
    const serverDoc = new Y.Doc();
    const serverState = Y.encodeStateAsUpdate(serverDoc);

    // Mock API endpoint with MSW
    server.use(
      http.get("http://localhost/api/projects/:projectId", () => {
        return new HttpResponse(serverState, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Version": "1",
          },
        });
      }),
    );

    // Set mock environment variable for blob token
    const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test-store_mock-secret";

    try {
      // Test
      const store = new NodeFsDocStore({
        projectId: "my-project",
        token: "auth-token",
        localDir: testDir,
        baseUrl: "http://localhost",
      });

      await store.sync(new AbortController().signal);

      // If no error is thrown, test passes
    } finally {
      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
      // Restore original token
      if (originalToken) {
        process.env.BLOB_READ_WRITE_TOKEN = originalToken;
      } else {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      }
    }
  });

  it("should download a.md file from server after sync", async () => {
    // Setup: Create a temporary directory for testing
    const testDir = path.join(tmpdir(), `node-fs-doc-store-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Setup: Create .config.json
    const configPath = path.join(testDir, ".config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        projectId: "test-project",
        version: 0,
      }),
      "utf-8",
    );

    // Setup: Create server document with a.md file at version 42
    const serverDoc = new Y.Doc();
    const filesMap = serverDoc.getMap("files");
    const blobsMap = serverDoc.getMap("blobs");

    const fileHash = "abc123def456"; // Mock hash for a.md
    const fileContent = "# Hello World\n\nThis is a test markdown file.\n";

    filesMap.set("a.md", {
      hash: fileHash,
      mtime: 1234567890,
    });
    blobsMap.set(fileHash, { size: fileContent.length });

    const serverState = Y.encodeStateAsUpdate(serverDoc);

    // Mock DocStore API endpoint
    server.use(
      http.get("http://localhost/api/projects/:projectId", () => {
        return new HttpResponse(serverState, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Version": "42",
          },
        });
      }),
    );

    // Mock Vercel Blob public URL download endpoint
    // Format: https://{storeId}.public.blob.vercel-storage.com/{hash}
    // For testing, we use a mock store ID "test-store"
    server.use(
      http.get(
        `https://test-store.public.blob.vercel-storage.com/${fileHash}`,
        () => {
          return new HttpResponse(fileContent, {
            status: 200,
            headers: {
              "Content-Type": "text/markdown",
            },
          });
        },
      ),
    );

    // Set mock environment variable for blob token
    const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test-store_mock-secret";

    try {
      // Test
      const store = new NodeFsDocStore({
        projectId: "test-project",
        token: "auth-token",
        localDir: testDir,
        baseUrl: "http://localhost",
      });

      await store.sync(new AbortController().signal);

      // Assert: a.md should exist in the local directory
      const filePath = path.join(testDir, "a.md");
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Assert: Content should match
      const actualContent = await fs.readFile(filePath, "utf-8");
      expect(actualContent).toBe(fileContent);
    } finally {
      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
      // Restore original token
      if (originalToken) {
        process.env.BLOB_READ_WRITE_TOKEN = originalToken;
      } else {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      }
    }
  });
});
