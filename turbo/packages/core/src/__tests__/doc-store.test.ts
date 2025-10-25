import { describe, it, expect, beforeEach } from "vitest";
import { DocStore } from "../doc-store";
import { server, http, HttpResponse } from "../test/msw-setup";
import * as Y from "yjs";

describe("DocStore", () => {
  it("should get file after setFile", () => {
    // Arrange
    const store = new DocStore({
      projectId: "test-project",
      token: "test-token",
    });

    // Act
    store.setFile("src/index.ts", "abc123hash", 1024);

    // Assert
    const file = store.getFile("src/index.ts");

    expect(file).toBeDefined();
    expect(file?.hash).toBe("abc123hash");
    expect(file?.mtime).toBeGreaterThan(0);
  });

  describe("sync", () => {
    beforeEach(() => {
      server.resetHandlers();
    });

    it("should fetch file from server after sync", async () => {
      // Arrange: Create a YJS document with a file
      const serverDoc = new Y.Doc();
      const filesMap = serverDoc.getMap("files");
      const blobsMap = serverDoc.getMap("blobs");

      filesMap.set("src/server.ts", {
        hash: "server-file-hash",
        mtime: 1234567890,
      });
      blobsMap.set("server-file-hash", { size: 2048 });

      const serverState = Y.encodeStateAsUpdate(serverDoc);

      // Mock the API endpoint
      server.use(
        http.get("http://localhost/api/projects/:projectId", ({ params }) => {
          expect(params.projectId).toBe("test-project");

          return new HttpResponse(serverState, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Version": "42",
            },
          });
        }),
      );

      const store = new DocStore({
        projectId: "test-project",
        token: "test-token",
        baseUrl: "http://localhost",
      });

      // Act: Sync with server
      await store.sync(new AbortController().signal);

      // Assert: Should have the file from server
      const file = store.getFile("src/server.ts");

      expect(file).toBeDefined();
      expect(file?.hash).toBe("server-file-hash");
      expect(file?.mtime).toBe(1234567890);
    });
  });
});
