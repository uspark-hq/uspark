import { describe, it, beforeEach } from "vitest";
import { NodeFsDocStore } from "../node-fs-doc-store";
import { server, http, HttpResponse } from "@uspark/core/test/msw-setup";
import * as Y from "yjs";

describe("NodeFsDocStore", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("should construct and sync without error", async () => {
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

    // Test
    const store = new NodeFsDocStore({
      projectId: "my-project",
      token: "auth-token",
      localDir: "./my-files",
      baseUrl: "http://localhost",
    });

    await store.sync(new AbortController().signal);

    // If no error is thrown, test passes
  });
});
