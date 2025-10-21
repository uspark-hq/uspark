import { http, HttpResponse } from "msw";
import { mockServer } from "./mock-server";

// Support both URLs used in tests
const API_BASE_URLS = ["http://localhost:3000", "https://www.uspark.ai"];

// Helper function to create handlers for multiple base URLs
function createHandlers() {
  const handlers = [];

  for (const API_BASE_URL of API_BASE_URLS) {
    handlers.push(
      // Device code generation
      http.post(`${API_BASE_URL}/api/cli/auth/device`, () => {
        return HttpResponse.json({
          device_code: "TEST-DEVICE-CODE",
          user_code: "WDJB-MJHT",
          verification_url: `${API_BASE_URL}/cli-auth`,
          expires_in: 900, // 15 minutes
        });
      }),

      // Token exchange - returns pending by default
      http.post(`${API_BASE_URL}/api/cli/auth/token`, () => {
        return HttpResponse.json({
          pending: true,
        });
      }),

      // Token generation for web UI
      http.post(`${API_BASE_URL}/api/cli/auth/generate-token`, () => {
        return HttpResponse.json({
          token: "cli_test_token_12345",
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }),

      // GET /api/projects/:projectId - Return YDoc binary data
      http.get(`${API_BASE_URL}/api/projects/:projectId`, ({ params }) => {
        const { projectId } = params;
        const ydocData = mockServer.getProject(projectId as string);

        return new HttpResponse(ydocData, {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });
      }),

      // PATCH /api/projects/:projectId - Accept YDoc updates
      http.patch(
        `${API_BASE_URL}/api/projects/:projectId`,
        async ({ params, request }) => {
          const { projectId } = params;
          const update = new Uint8Array(await request.arrayBuffer());

          mockServer.patchProject(projectId as string, update);

          return new HttpResponse(null, { status: 200 });
        },
      ),

      // GET /api/blob-store - Return store ID
      http.get(`${API_BASE_URL}/api/blob-store`, () => {
        return HttpResponse.json({
          store_id: "mock-store-id",
        });
      }),

      // GET /api/projects/:projectId/blob-token - Return STS token for blob access
      http.get(`${API_BASE_URL}/api/projects/:projectId/blob-token`, () => {
        return HttpResponse.json({
          token: "vercel_blob_rw_123456789_abcdefghijklmnopqrstuvwxyz",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          uploadUrl: "https://blob.mock/upload",
          downloadUrlPrefix: "https://blob.mock/download",
        });
      }),

      // GET /api/blobs/:hash - Return blob content (for file content)
      http.get(`${API_BASE_URL}/api/blobs/:hash`, ({ params }) => {
        const { hash } = params;
        const content = mockServer.getBlobContent(hash as string);

        if (!content) {
          return new HttpResponse("Blob not found", { status: 404 });
        }

        return new HttpResponse(content, {
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }),

      // Worker management API
      // POST /api/projects/:projectId/workers - Register worker
      http.post(
        `${API_BASE_URL}/api/projects/:projectId/workers`,
        ({ params }) => {
          const { projectId } = params;
          return HttpResponse.json({
            id: `worker-${Date.now()}`,
            projectId,
            userId: "test-user",
            name: "test-worker",
            status: "active",
            lastHeartbeatAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        },
      ),

      // PATCH /api/projects/:projectId/workers/:workerId - Send heartbeat
      http.patch(
        `${API_BASE_URL}/api/projects/:projectId/workers/:workerId`,
        ({ params }) => {
          const { projectId, workerId } = params;
          return HttpResponse.json({
            id: workerId,
            projectId,
            userId: "test-user",
            name: "test-worker",
            status: "active",
            lastHeartbeatAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        },
      ),

      // DELETE /api/projects/:projectId/workers/:workerId - Unregister worker
      http.delete(
        `${API_BASE_URL}/api/projects/:projectId/workers/:workerId`,
        () => {
          return HttpResponse.json({ success: true });
        },
      ),
    );
  }

  // Add blob storage handlers (these are independent of API_BASE_URL)
  handlers.push(
    // Mock blob upload with project isolation
    http.put("https://blob.mock/upload/projects/:projectId/:hash", () => {
      return new HttpResponse("OK", { status: 201 });
    }),

    // Mock blob download with project isolation
    http.get(
      "https://blob.mock/download/projects/:projectId/:hash",
      ({ params }) => {
        const { hash } = params;
        const content = mockServer.getBlobContent(hash as string);
        if (content) {
          return HttpResponse.text(content);
        }
        return new HttpResponse("", { status: 404 });
      },
    ),

    // Mock public Vercel blob storage URLs
    http.get(
      "https://mock-store-id.public.blob.vercel-storage.com/projects/:projectId/:hash",
      ({ params }) => {
        const { hash } = params;
        const content = mockServer.getBlobContent(hash as string);
        if (content) {
          return HttpResponse.text(content);
        }
        return new HttpResponse("Blob not found", { status: 404 });
      },
    ),
  );

  return handlers;
}

// Mock handlers for authentication endpoints
export const handlers = createHandlers();
