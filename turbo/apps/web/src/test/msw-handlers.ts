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
          url: "https://uspark.dev/share/token-1",
          createdAt: "2024-01-01T10:00:00Z",
          accessedCount: 5,
          lastAccessedAt: "2024-01-02T15:00:00Z",
        },
        {
          id: "share-2",
          token: "token-2",
          projectId: "project-2",
          filePath: "README.md",
          url: "https://uspark.dev/share/token-2",
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

// Export all handlers
export const handlers = [
  ...clerkHandlers,
  ...projectsHandlers,
  ...shareHandlers,
];
