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

      // Assert: Should have version 42
      expect(store.getVersion()).toBe(42);
    });

    it("should push local changes and update version", async () => {
      // Step 1: First sync - GET to fetch initial state with version 42
      const serverDoc = new Y.Doc();
      const filesMap = serverDoc.getMap("files");
      const blobsMap = serverDoc.getMap("blobs");

      filesMap.set("src/app.ts", {
        hash: "original-hash",
        mtime: 1000000000,
      });
      blobsMap.set("original-hash", { size: 1024 });

      server.use(
        http.get("http://localhost/api/projects/:projectId", () => {
          return new HttpResponse(Y.encodeStateAsUpdate(serverDoc), {
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

      await store.sync(new AbortController().signal);

      // Verify version 42
      expect(store.getVersion()).toBe(42);
      expect(store.getFile("src/app.ts")?.hash).toBe("original-hash");

      // Step 2: Modify file locally
      store.setFile("src/app.ts", "modified-hash", 2048);

      // Step 3: Second sync - PATCH to push changes, get version 43
      server.use(
        http.patch(
          "http://localhost/api/projects/:projectId",
          async ({ request }) => {
            // Verify headers
            expect(request.headers.get("If-Match")).toBe("42");
            expect(request.headers.get("Content-Type")).toBe(
              "application/octet-stream",
            );

            // Read and apply the update to server doc
            const updateBuffer = await request.arrayBuffer();
            const update = new Uint8Array(updateBuffer);
            Y.applyUpdate(serverDoc, update);

            // Verify server doc now has the modified hash
            const updatedFile = serverDoc.getMap("files").get("src/app.ts");
            expect(updatedFile).toBeDefined();
            expect((updatedFile as any).hash).toBe("modified-hash");

            // Return updated state with new version
            return new HttpResponse(Y.encodeStateAsUpdate(serverDoc), {
              status: 200,
              headers: {
                "Content-Type": "application/octet-stream",
                "X-Version": "43",
              },
            });
          },
        ),
      );

      await store.sync(new AbortController().signal);

      // Step 4: Verify version is now 43
      expect(store.getVersion()).toBe(43);
      expect(store.getFile("src/app.ts")?.hash).toBe("modified-hash");
    });
  });
});
