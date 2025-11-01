import { describe, it, expect, beforeEach, vi } from "vitest";
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
      vi.clearAllMocks();
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
        // GET /diff - no server updates
        http.get("http://localhost/api/projects/:projectId/diff", () => {
          return new HttpResponse(null, { status: 304 });
        }),

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
            const updatedFile = serverDoc
              .getMap<{ hash: string; mtime: number }>("files")
              .get("src/app.ts");
            expect(updatedFile).toBeDefined();
            expect(updatedFile?.hash).toBe("modified-hash");

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

    it("should handle three-way merge with concurrent modifications", async () => {
      // Setup: Create v42 with only file-a
      const serverDocV42 = new Y.Doc();
      serverDocV42
        .getMap("files")
        .set("file-a.txt", { hash: "hash-a0", mtime: 1000 });
      serverDocV42.getMap("blobs").set("hash-a0", { size: 100 });
      const snapshotV42 = Y.encodeStateAsUpdate(serverDocV42);
      const stateVectorV42 = Y.encodeStateVector(serverDocV42);

      // Setup: Create v43 - server adds file-b and file-c
      const serverDocV43 = new Y.Doc();
      Y.applyUpdate(serverDocV43, snapshotV42);
      serverDocV43
        .getMap("files")
        .set("file-b.txt", { hash: "hash-b2", mtime: 2000 });
      serverDocV43.getMap("blobs").set("hash-b2", { size: 200 });
      serverDocV43
        .getMap("files")
        .set("file-c.txt", { hash: "hash-c2", mtime: 3000 });
      serverDocV43.getMap("blobs").set("hash-c2", { size: 300 });
      const snapshotV43 = Y.encodeStateAsUpdate(serverDocV43);
      const diffV42ToV43 = Y.encodeStateAsUpdate(serverDocV43, stateVectorV42);
      const stateVectorV43 = Y.encodeStateVector(serverDocV43);

      let serverCurrentVersion = 42;

      server.use(
        // GET - return current version
        http.get("http://localhost/api/projects/:projectId", () => {
          const snapshot =
            serverCurrentVersion === 42 ? snapshotV42 : snapshotV43;
          return new HttpResponse(snapshot, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Version": serverCurrentVersion.toString(),
            },
          });
        }),

        // GET /diff - return server updates
        http.get(
          "http://localhost/api/projects/:projectId/diff",
          ({ request }) => {
            const url = new URL(request.url);
            const fromVersion = parseInt(
              url.searchParams.get("fromVersion") || "0",
            );

            serverCurrentVersion = 43; // Server upgrades to v43

            if (fromVersion === 42 && serverCurrentVersion === 43) {
              // Encode response: [length(4 bytes)][stateVector][diff]
              const responseBuffer = new ArrayBuffer(
                4 + stateVectorV43.length + diffV42ToV43.length,
              );
              const view = new DataView(responseBuffer);
              view.setUint32(0, stateVectorV43.length, false);

              const responseArray = new Uint8Array(responseBuffer);
              responseArray.set(stateVectorV43, 4);
              responseArray.set(diffV42ToV43, 4 + stateVectorV43.length);

              return new HttpResponse(responseArray, {
                status: 200,
                headers: {
                  "Content-Type": "application/octet-stream",
                  "X-Version": "43",
                },
              });
            }

            return new HttpResponse(null, { status: 304 });
          },
        ),

        // PATCH - apply client changes
        http.patch(
          "http://localhost/api/projects/:projectId",
          async ({ request }) => {
            const ifMatch = request.headers.get("If-Match");
            expect(ifMatch).toBe("43");

            const updateBuffer = await request.arrayBuffer();
            const clientUpdate = new Uint8Array(updateBuffer);

            // Apply client update to server v43
            const serverDocV44 = new Y.Doc();
            Y.applyUpdate(serverDocV44, snapshotV43);
            Y.applyUpdate(serverDocV44, clientUpdate);

            // Verify merge result - all three files should exist
            const filesV44 = serverDocV44.getMap("files");

            expect(filesV44.get("file-a.txt")?.hash).toBe("hash-a1"); // Client modified
            expect(filesV44.has("file-b.txt")).toBe(true); // Either hash-b1 or hash-b2 (YJS decides)
            expect(filesV44.get("file-c.txt")?.hash).toBe("hash-c2"); // Server only

            const snapshotV44 = Y.encodeStateAsUpdate(serverDocV44);
            return new HttpResponse(snapshotV44, {
              status: 200,
              headers: {
                "Content-Type": "application/octet-stream",
                "X-Version": "44",
              },
            });
          },
        ),
      );

      const store = new DocStore({
        projectId: "test-project",
        token: "test-token",
        baseUrl: "http://localhost",
      });

      await store.sync(new AbortController().signal);
      expect(store.getVersion()).toBe(42);
      expect(store.getFile("file-a.txt")?.hash).toBe("hash-a0");

      store.setFile("file-a.txt", "hash-a1", 110);
      store.setFile("file-b.txt", "hash-b1", 200);

      await store.sync(new AbortController().signal);
      expect(store.getVersion()).toBe(44);
      expect(store.getFile("file-a.txt")?.hash).toBe("hash-a1");
      expect(store.getFile("file-b.txt")).toBeDefined();
      expect(store.getFile("file-c.txt")?.hash).toBe("hash-c2");
    });

    it("should handle deletion and concurrent modifications", async () => {
      // Setup: Create v42 with file-a and file-b
      const serverDocV42 = new Y.Doc();
      serverDocV42
        .getMap("files")
        .set("file-a.txt", { hash: "hash-a0", mtime: 1000 });
      serverDocV42.getMap("blobs").set("hash-a0", { size: 100 });
      serverDocV42
        .getMap("files")
        .set("file-b.txt", { hash: "hash-b0", mtime: 2000 });
      serverDocV42.getMap("blobs").set("hash-b0", { size: 200 });
      const snapshotV42 = Y.encodeStateAsUpdate(serverDocV42);
      const stateVectorV42 = Y.encodeStateVector(serverDocV42);

      // Setup: Create v43 - another client modifies file-b and adds file-c
      const serverDocV43 = new Y.Doc();
      Y.applyUpdate(serverDocV43, snapshotV42);
      serverDocV43
        .getMap("files")
        .set("file-b.txt", { hash: "hash-b3", mtime: 2100 }); // Modified by another client
      serverDocV43.getMap("blobs").set("hash-b3", { size: 210 });
      serverDocV43
        .getMap("files")
        .set("file-c.txt", { hash: "hash-c3", mtime: 3000 }); // Added by another client
      serverDocV43.getMap("blobs").set("hash-c3", { size: 300 });
      const snapshotV43 = Y.encodeStateAsUpdate(serverDocV43);
      const diffV42ToV43 = Y.encodeStateAsUpdate(serverDocV43, stateVectorV42);
      const stateVectorV43 = Y.encodeStateVector(serverDocV43);

      let serverCurrentVersion = 42;

      server.use(
        // GET - return initial state
        http.get("http://localhost/api/projects/:projectId", () => {
          return new HttpResponse(snapshotV42, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Version": "42",
            },
          });
        }),

        // GET /diff - return server updates
        http.get(
          "http://localhost/api/projects/:projectId/diff",
          ({ request }) => {
            const url = new URL(request.url);
            const fromVersion = parseInt(
              url.searchParams.get("fromVersion") || "0",
            );

            serverCurrentVersion = 43; // Server upgrades to v43

            if (fromVersion === 42 && serverCurrentVersion === 43) {
              // Encode response: [length(4 bytes)][stateVector][diff]
              const responseBuffer = new ArrayBuffer(
                4 + stateVectorV43.length + diffV42ToV43.length,
              );
              const view = new DataView(responseBuffer);
              view.setUint32(0, stateVectorV43.length, false);

              const responseArray = new Uint8Array(responseBuffer);
              responseArray.set(stateVectorV43, 4);
              responseArray.set(diffV42ToV43, 4 + stateVectorV43.length);

              return new HttpResponse(responseArray, {
                status: 200,
                headers: {
                  "Content-Type": "application/octet-stream",
                  "X-Version": "43",
                },
              });
            }

            return new HttpResponse(null, { status: 304 });
          },
        ),

        // PATCH - apply client changes (deletion of a, modification of b)
        http.patch(
          "http://localhost/api/projects/:projectId",
          async ({ request }) => {
            const ifMatch = request.headers.get("If-Match");
            expect(ifMatch).toBe("43");

            const updateBuffer = await request.arrayBuffer();
            const clientUpdate = new Uint8Array(updateBuffer);

            // Apply client update to server v43
            const serverDocV44 = new Y.Doc();
            Y.applyUpdate(serverDocV44, snapshotV43);
            Y.applyUpdate(serverDocV44, clientUpdate);

            // Verify final state in v44
            const filesV44 = serverDocV44.getMap("files");

            // file-a should be deleted
            expect(filesV44.has("file-a.txt")).toBe(false);
            // file-b should exist (YJS will resolve the conflict)
            expect(filesV44.has("file-b.txt")).toBe(true);
            // file-c should exist (from server)
            expect(filesV44.get("file-c.txt")?.hash).toBe("hash-c3");

            const snapshotV44 = Y.encodeStateAsUpdate(serverDocV44);
            return new HttpResponse(snapshotV44, {
              status: 200,
              headers: {
                "Content-Type": "application/octet-stream",
                "X-Version": "44",
              },
            });
          },
        ),
      );

      const store = new DocStore({
        projectId: "test-project",
        token: "test-token",
        baseUrl: "http://localhost",
      });

      // Step 1: Initial sync - get v42 with file-a and file-b
      await store.sync(new AbortController().signal);
      expect(store.getVersion()).toBe(42);
      expect(store.getFile("file-a.txt")?.hash).toBe("hash-a0");
      expect(store.getFile("file-b.txt")?.hash).toBe("hash-b0");

      // Step 2: Local client deletes file-a and modifies file-b
      store.deleteFile("file-a.txt");
      store.setFile("file-b.txt", "hash-b1", 220);

      // Step 3: Sync - pull server updates (b modified to hash-b3, c added) and push local changes (a deleted, b modified to hash-b1)
      await store.sync(new AbortController().signal);

      // Step 4: Verify final state in v44
      expect(store.getVersion()).toBe(44);
      expect(store.getFile("file-a.txt")).toBeUndefined(); // Deleted
      expect(store.getFile("file-b.txt")).toBeDefined(); // Exists (YJS resolved conflict)
      expect(store.getFile("file-c.txt")?.hash).toBe("hash-c3"); // From server
    });

    it("should dump and load state correctly", () => {
      const store1 = new DocStore({
        projectId: "test-project",
        token: "test-token",
      });

      // Add some data
      store1.setFile("test.txt", "hash123", 100);
      store1.setFile("test2.txt", "hash456", 200);

      // Dump state
      const snapshot = store1.dump();
      expect(snapshot).toBeInstanceOf(Uint8Array);
      expect(snapshot.length).toBeGreaterThan(0);

      // Create new store and load
      const store2 = new DocStore({
        projectId: "test-project",
        token: "test-token",
      });
      store2.load(snapshot);

      // Verify data is identical
      expect(store2.getFile("test.txt")).toEqual({
        hash: "hash123",
        mtime: expect.any(Number),
      });
      expect(store2.getFile("test2.txt")).toEqual({
        hash: "hash456",
        mtime: expect.any(Number),
      });

      // Verify all files match
      const files1 = store1.getAllFiles();
      const files2 = store2.getAllFiles();
      expect(files2.size).toBe(files1.size);
    });

    it("should merge loaded state with existing state", () => {
      const store = new DocStore({
        projectId: "test-project",
        token: "test-token",
      });

      // Add initial data
      store.setFile("existing.txt", "hash-existing", 50);

      // Create another store with different data
      const otherStore = new DocStore({
        projectId: "test-project",
        token: "test-token",
      });
      otherStore.setFile("new.txt", "hash-new", 75);

      // Dump and load - should merge
      const snapshot = otherStore.dump();
      store.load(snapshot);

      // Both files should exist (YJS CRDT merge)
      expect(store.getFile("existing.txt")).toBeDefined();
      expect(store.getFile("new.txt")).toBeDefined();
    });

    it("should handle 409 conflict on PATCH by returning early", async () => {
      // Setup: Create v42 with file-a
      const serverDocV42 = new Y.Doc();
      serverDocV42
        .getMap("files")
        .set("file-a.txt", { hash: "hash-a0", mtime: 1000 });
      serverDocV42.getMap("blobs").set("hash-a0", { size: 100 });
      const snapshotV42 = Y.encodeStateAsUpdate(serverDocV42);

      server.use(
        // GET - return initial state
        http.get("http://localhost/api/projects/:projectId", () => {
          return new HttpResponse(snapshotV42, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Version": "42",
            },
          });
        }),

        // GET /diff - no updates
        http.get("http://localhost/api/projects/:projectId/diff", () => {
          return new HttpResponse(null, { status: 304 });
        }),

        // PATCH - return 409 conflict
        http.patch("http://localhost/api/projects/:projectId", () => {
          return new HttpResponse(null, { status: 409 });
        }),
      );

      const store = new DocStore({
        projectId: "test-project",
        token: "test-token",
        baseUrl: "http://localhost",
      });

      // Initial sync
      await store.sync(new AbortController().signal);
      expect(store.getVersion()).toBe(42);

      // Modify locally
      store.setFile("file-a.txt", "hash-a1", 110);

      // Sync - should get 409 and return early without error
      await store.sync(new AbortController().signal);

      // Should still be at version 42 (not updated due to conflict)
      expect(store.getVersion()).toBe(42);
      // Local change should still be present
      expect(store.getFile("file-a.txt")?.hash).toBe("hash-a1");
    });
  });
});
