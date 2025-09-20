import { http, HttpResponse } from "msw";

// Clerk API endpoints handlers
const clerkHandlers = [
  // Mock users list endpoint
  http.get("https://api.clerk.com/v1/users", () => {
    return HttpResponse.json([
      {
        object: "user",
        id: "user_test_123",
        username: "testuser",
        first_name: "Test",
        last_name: "User",
        email_addresses: [
          {
            id: "email_test_123",
            email_address: "test@example.com",
            verification: {
              status: "verified",
            },
          },
        ],
        primary_email_address_id: "email_test_123",
        created_at: Date.now() - 86400000,
        updated_at: Date.now(),
      },
    ]);
  }),

  // Mock sessions list endpoint
  http.get("https://api.clerk.com/v1/sessions", () => {
    return HttpResponse.json([
      {
        object: "session",
        id: "sess_test_123",
        status: "active",
        expire_at: Date.now() + 3600000,
        abandon_at: Date.now() + 7200000,
        last_active_at: Date.now(),
        user_id: "user_test_123",
        created_at: Date.now() - 3600000,
        updated_at: Date.now(),
      },
    ]);
  }),

  // Mock JWKS endpoint for JWT verification
  http.get("https://*.clerk.accounts.dev/.well-known/jwks.json", () => {
    return HttpResponse.json({
      keys: [
        {
          use: "sig",
          kty: "RSA",
          kid: "test-key-id",
          alg: "RS256",
          n: "xGOr-H7A-PWG3v0VmZn4P3Ynk_EuJGmPogKDWBLXEGmpr9PJirXDqkRWRoO7nnmYTl0bvJQWtOfNhMz5VVbrqQayYnqBHFBdSazSHDNOqmVEznvLwuKjD7rdHwEWgssSXUQ2RYq9_zxN3kOjvJANPe4X9Pd8DW-LcUgvnxQUW-MGWj5fQGZV1OvqNCJm6peGMkleD",
          e: "AQAB",
        },
      ],
    });
  }),

  // Mock session endpoint
  http.get("https://api.clerk.com/v1/sessions/:sessionId", () => {
    return HttpResponse.json({
      object: "session",
      id: "sess_test_123",
      status: "active",
      expire_at: Date.now() + 3600000,
      abandon_at: Date.now() + 7200000,
      last_active_at: Date.now(),
      user_id: "user_test_123",
      created_at: Date.now() - 3600000,
      updated_at: Date.now(),
    });
  }),

  // Mock user endpoint
  http.get("https://api.clerk.com/v1/users/:userId", () => {
    return HttpResponse.json({
      object: "user",
      id: "user_test_123",
      username: "testuser",
      first_name: "Test",
      last_name: "User",
      email_addresses: [
        {
          id: "email_test_123",
          email_address: "test@example.com",
          verification: {
            status: "verified",
          },
        },
      ],
      primary_email_address_id: "email_test_123",
      created_at: Date.now() - 86400000,
      updated_at: Date.now(),
    });
  }),

  // Mock token verification endpoint
  http.post("https://api.clerk.com/v1/tokens/verify", () => {
    return HttpResponse.json({
      object: "token",
      jwt: "mock-jwt-token",
      status: "verified",
    });
  }),

  // Mock client endpoint (for frontend SDK)
  http.get("https://*.clerk.accounts.dev/v1/client", () => {
    return HttpResponse.json({
      object: "client",
      id: "client_test_123",
      sessions: [
        {
          object: "session",
          id: "sess_test_123",
          status: "active",
          user: {
            id: "user_test_123",
            username: "testuser",
            first_name: "Test",
            last_name: "User",
            email_addresses: ["test@example.com"],
          },
        },
      ],
      sign_in: null,
      sign_up: null,
      last_active_session_id: "sess_test_123",
      created_at: Date.now() - 3600000,
      updated_at: Date.now(),
    });
  }),

  // Mock environment endpoint
  http.get("https://*.clerk.accounts.dev/v1/environment", () => {
    return HttpResponse.json({
      object: "environment",
      id: "env_test_123",
      auth_config: {
        single_session_mode: false,
        enhanced_email_deliverability: false,
        test_mode: true,
      },
      display_config: {
        branded: false,
        preferred_sign_in_strategy: "password",
      },
      user_settings: {
        attributes: {
          email_address: {
            enabled: true,
            required: true,
            verifications: ["email_code"],
          },
          username: {
            enabled: true,
            required: false,
          },
        },
        sign_up: {
          progressive: false,
          mode: "public",
        },
      },
      organization_settings: {
        enabled: false,
      },
    });
  }),
];

// Projects API endpoints handlers
const projectsHandlers = [
  // GET /api/projects - List user's projects
  http.get("*/api/projects", () => {
    return HttpResponse.json({
      projects: [
        {
          id: "demo-project-123",
          name: "Demo Project",
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "web-app-456",
          name: "Web Application",
          created_at: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          id: "api-service-789",
          name: "API Service",
          created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          updated_at: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ],
    });
  }),

  // POST /api/projects - Create a new project
  http.post("*/api/projects", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const newProject = {
      id: `project-${Date.now()}`,
      name: body.name,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newProject, { status: 201 });
  }),

  // Session endpoints for chat interface
  // POST /api/projects/:projectId/sessions - Create session
  http.post("*/api/projects/:projectId/sessions", async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    return HttpResponse.json({
      id: `session-${Date.now()}`,
      title: body.title || "Claude Code Session",
      projectId: request.url.split("/")[5], // Extract projectId from URL
      createdAt: new Date().toISOString(),
      status: "active",
    });
  }),

  // GET /api/projects/:projectId/sessions/:sessionId/turns - Get turns
  http.get("*/api/projects/:projectId/sessions/:sessionId/turns", () => {
    return HttpResponse.json({
      turns: [],
    });
  }),

  // POST /api/projects/:projectId/sessions/:sessionId/turns - Create turn
  http.post(
    "*/api/projects/:projectId/sessions/:sessionId/turns",
    async ({ request }) => {
      const body = (await request.json()) as { userMessage: string };
      return HttpResponse.json({
        id: `turn-${Date.now()}`,
        userPrompt: body.userMessage,
        status: "pending",
        blocks: [],
        createdAt: new Date().toISOString(),
      });
    },
  ),

  // GET /api/projects/:projectId/sessions/:sessionId/turns/:turnId - Get turn with blocks
  http.get(
    "*/api/projects/:projectId/sessions/:sessionId/turns/:turnId",
    () => {
      return HttpResponse.json({
        blocks: [],
      });
    },
  ),

  // POST /api/projects/:projectId/sessions/:sessionId/mock-execute - Mock execute
  http.post(
    "*/api/projects/:projectId/sessions/:sessionId/mock-execute",
    () => {
      return HttpResponse.json({
        turn_id: `turn-${Date.now()}`,
        status: "success",
      });
    },
  ),

  // GET /api/projects/:projectId/sessions/:sessionId/updates - Long polling updates
  http.get(
    "*/api/projects/:projectId/sessions/:sessionId/updates",
    async ({ request }) => {
      const url = new URL(request.url);
      const timeout = url.searchParams.get("timeout");

      // For immediate requests (refetch), return 204 immediately
      if (timeout === "0") {
        return new HttpResponse(null, { status: 204 });
      } else {
        // For long polling requests, simulate waiting but respond to abort signals
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new HttpResponse(null, { status: 204 }));
          }, 200); // Short delay for tests instead of 30 seconds

          // Listen for abort signal
          if (request.signal) {
            request.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              reject(new Error("Aborted"));
            });
          }
        });
      }
    },
  ),

  // GitHub repository endpoint for project page
  http.get("*/api/projects/:projectId/github/repository", () => {
    return HttpResponse.json({
      owner: "test-owner",
      name: "test-repo",
      fullName: "test-owner/test-repo",
      isConnected: false,
    });
  }),

  // GitHub installations endpoint
  http.get("*/api/github/installations", () => {
    return HttpResponse.json({
      installations: [],
    });
  }),

  // GET /api/projects/:projectId - Get project YJS data
  http.get("*/api/projects/:projectId", () => {
    // Mock empty YJS document (for testing)
    const mockYjsData = new Uint8Array([0, 0, 0, 0]); // Minimal YJS document

    return new HttpResponse(mockYjsData, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Version": "1",
      },
    });
  }),
];

// Share API endpoints handlers
const shareHandlers = [
  // GET /api/shares - List user's shares
  http.get("*/api/shares", () => {
    return HttpResponse.json({
      shares: [
        {
          id: "share-1",
          token: "token-1",
          projectId: "project-1",
          filePath: "src/test.ts",
          url: "https://www.uspark.ai/share/token-1",
          createdAt: "2024-01-01T10:00:00Z",
          accessedCount: 5,
          lastAccessedAt: "2024-01-02T15:00:00Z",
        },
        {
          id: "share-2",
          token: "token-2",
          projectId: "project-2",
          filePath: "README.md",
          url: "https://www.uspark.ai/share/token-2",
          createdAt: "2024-01-03T10:00:00Z",
          accessedCount: 0,
          lastAccessedAt: null,
        },
      ],
    });
  }),

  // DELETE /api/shares/:id - Delete a share
  http.delete("*/api/shares/:id", () => {
    return HttpResponse.json({ success: true });
  }),
];

// GitHub API endpoints handlers
const githubHandlers = [
  // Mock GitHub App access token endpoint
  http.post(
    "https://api.github.com/app/installations/:installationId/access_tokens",
    () => {
      return HttpResponse.json({
        token: "ghs_test_installation_token_12345",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        permissions: {
          contents: "write",
          metadata: "read",
          pull_requests: "write",
        },
      });
    },
  ),

  // Mock GitHub installation endpoint
  http.get("https://api.github.com/app/installations/:installationId", () => {
    return HttpResponse.json({
      id: 12345,
      account: {
        login: "test-owner",
        id: 67890,
        type: "User",
        site_admin: false,
      },
      app_id: 123456,
      app_slug: "uspark-test",
      target_id: 67890,
      target_type: "User",
      permissions: {
        contents: "write",
        metadata: "read",
        pull_requests: "write",
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });
  }),

  // Mock GitHub get ref endpoint
  http.get("https://api.github.com/repos/:owner/:repo/git/ref/*", () => {
    return HttpResponse.json({
      ref: "refs/heads/main",
      node_id: "MDM6UmVmcmVmcmVzaA==",
      url: "https://api.github.com/repos/test-owner/test-repo/git/refs/heads/main",
      object: {
        sha: "current-sha-123",
        type: "commit",
        url: "https://api.github.com/repos/test-owner/test-repo/git/commits/current-sha-123",
      },
    });
  }),

  // Mock GitHub get commit endpoint
  http.get("https://api.github.com/repos/:owner/:repo/git/commits/:sha", () => {
    return HttpResponse.json({
      sha: "current-sha-123",
      url: "https://api.github.com/repos/test-owner/test-repo/git/commits/current-sha-123",
      tree: {
        sha: "tree-sha-456",
        url: "https://api.github.com/repos/test-owner/test-repo/git/trees/tree-sha-456",
      },
      message: "Initial commit",
      author: {
        date: "2024-01-01T00:00:00Z",
        name: "Test User",
        email: "test@example.com",
      },
      committer: {
        date: "2024-01-01T00:00:00Z",
        name: "Test User",
        email: "test@example.com",
      },
      parents: [],
    });
  }),

  // Mock GitHub create blob endpoint
  http.post("https://api.github.com/repos/:owner/:repo/git/blobs", () => {
    return HttpResponse.json({
      url: "https://api.github.com/repos/test-owner/test-repo/git/blobs/blob-sha-789",
      sha: "blob-sha-789",
    });
  }),

  // Mock GitHub create tree endpoint
  http.post("https://api.github.com/repos/:owner/:repo/git/trees", () => {
    return HttpResponse.json({
      sha: "new-tree-sha-101",
      url: "https://api.github.com/repos/test-owner/test-repo/git/trees/new-tree-sha-101",
      tree: [],
    });
  }),

  // Mock GitHub create commit endpoint
  http.post("https://api.github.com/repos/:owner/:repo/git/commits", () => {
    return HttpResponse.json({
      sha: "new-commit-sha-202",
      url: "https://api.github.com/repos/test-owner/test-repo/git/commits/new-commit-sha-202",
      tree: {
        sha: "new-tree-sha-101",
        url: "https://api.github.com/repos/test-owner/test-repo/git/trees/new-tree-sha-101",
      },
      message: "Sync from uSpark at 2024-01-01T00:00:00.000Z",
      author: {
        date: "2024-01-01T00:00:00Z",
        name: "uSpark",
        email: "noreply@uspark.ai",
      },
      committer: {
        date: "2024-01-01T00:00:00Z",
        name: "uSpark",
        email: "noreply@uspark.ai",
      },
      parents: [
        {
          sha: "current-sha-123",
          url: "https://api.github.com/repos/test-owner/test-repo/git/commits/current-sha-123",
        },
      ],
    });
  }),

  // Mock GitHub update ref endpoint
  http.patch("https://api.github.com/repos/:owner/:repo/git/refs/*", () => {
    return HttpResponse.json({
      ref: "refs/heads/main",
      node_id: "MDM6UmVmcmVmcmVzaA==",
      url: "https://api.github.com/repos/test-owner/test-repo/git/refs/heads/main",
      object: {
        sha: "new-commit-sha-202",
        type: "commit",
        url: "https://api.github.com/repos/test-owner/test-repo/git/commits/new-commit-sha-202",
      },
    });
  }),
];

// Vercel Blob handlers
const blobHandlers = [
  // Mock blob download
  http.get(
    "https://*.public.blob.vercel-storage.com/projects/:projectId/:hash",
    () => {
      return HttpResponse.arrayBuffer(new ArrayBuffer(100));
    },
  ),

  // Mock blob upload (PUT request for Vercel blob storage)
  http.put("https://*.blob.vercel-storage.com/projects/*", () => {
    return HttpResponse.json({
      url: `https://test-blob.public.blob.vercel-storage.com/projects/test-project/test-file-${Date.now()}`,
      downloadUrl: `https://test-blob.public.blob.vercel-storage.com/projects/test-project/test-file-${Date.now()}`,
      pathname: `/projects/test-project/test-file-${Date.now()}`,
      size: 1024,
      uploadedAt: new Date().toISOString(),
    });
  }),
];

// Export all handlers
export const handlers = [
  ...clerkHandlers,
  ...projectsHandlers,
  ...shareHandlers,
  ...githubHandlers,
  ...blobHandlers,
];
