import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";
import { createInstallationOctokit } from "../../../../src/lib/github/client";
import { server, http, HttpResponse } from "../../../../src/test/msw-setup";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub client
vi.mock("../../../../src/lib/github/client", () => ({
  createInstallationOctokit: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("POST /api/github/verify-repo", () => {
  const testUserId = `test-user-verify-${Date.now()}-${process.pid}`;
  // Combine pid and timestamp to ensure uniqueness within PostgreSQL integer range (-2147483648 to 2147483647)
  const baseInstallationId =
    (process.pid % 10000) * 100000 + (Math.floor(Date.now() / 1000) % 100000);

  beforeEach(async () => {
    vi.clearAllMocks();

    // Initialize real database connection
    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.userId, testUserId));

    // Default to authenticated user
    mockAuth.mockResolvedValue({ userId: testUserId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Set up default MSW handler to return 404 for public repo checks
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo", () => {
        return HttpResponse.json({}, { status: 404 });
      }),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("URL format parsing", () => {
    it("accepts owner/repo format", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "facebook/react" }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return 404 since repo doesn't exist (mocked as 404)
      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts HTTPS URL format", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "https://github.com/facebook/react",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts HTTPS URL with .git suffix", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "https://github.com/facebook/react.git",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts SSH URL format", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "git@github.com:facebook/react.git",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts repository names with dots", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "backend/backend.ai" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts repository names with multiple dots", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "owner/repo.with.multiple.dots" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts owner names with dots", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "owner.name/repo" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts HTTPS URL with dots in repo name", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "https://github.com/backend/backend.ai",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("accepts SSH URL with dots in repo name", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "git@github.com:backend/backend.ai.git",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("rejects invalid format", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "not a valid repo" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_format");
    });

    it("rejects empty string", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("Repository verification", () => {
    it("returns installed repo when found in user's installations", async () => {
      // Create installation for user
      await globalThis.services.db.insert(githubInstallations).values({
        userId: testUserId,
        installationId: baseInstallationId,
        accountName: "testuser",
      });

      // Mock GitHub API response
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            repositories: [
              {
                id: 100,
                name: "test-repo",
                full_name: "testuser/test-repo",
                private: true,
                html_url: "https://github.com/testuser/test-repo",
              },
            ],
          },
        }),
      };

      vi.mocked(createInstallationOctokit).mockResolvedValue(
        mockOctokit as never,
      );

      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "testuser/test-repo" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.type).toBe("installed");
      expect(data.fullName).toBe("testuser/test-repo");
      expect(data.installationId).toBe(baseInstallationId);
    });

    it("returns public repo when not in installations but publicly accessible", async () => {
      // Use MSW to mock GitHub API response for public repo
      server.use(
        http.get("https://api.github.com/repos/facebook/react", () => {
          return HttpResponse.json({
            name: "react",
            full_name: "facebook/react",
            private: false,
          });
        }),
      );

      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "facebook/react" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.type).toBe("public");
      expect(data.fullName).toBe("facebook/react");
    });

    it("rejects private repo not in installations", async () => {
      // Use MSW to mock GitHub API response for private repo
      server.use(
        http.get("https://api.github.com/repos/someuser/private-repo", () => {
          return HttpResponse.json({
            name: "private-repo",
            full_name: "someuser/private-repo",
            private: true,
          });
        }),
      );

      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "someuser/private-repo" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("repository_private");
    });

    it("returns 404 when repository does not exist", async () => {
      // Default MSW handler already returns 404, no need to override
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "nonexistent/repo" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ repoUrl: "facebook/react" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });
});
