import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createTestGitHubInstallation } from "../../../../src/test/db-test-utils";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub client
vi.mock("../../../../src/lib/github/client", () => ({
  getInstallationDetails: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { getInstallationDetails } from "../../../../src/lib/github/client";
const mockAuth = vi.mocked(auth);
const mockGetInstallationDetails = vi.mocked(getInstallationDetails);

describe("/api/github/setup", () => {
  const userId = `test-user-github-setup-${Date.now()}-${process.pid}`;
  // Use fixed ID for all tests in this file since they clean up after themselves
  const installationId = "400001";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Mock GitHub API response by default
    mockGetInstallationDetails.mockResolvedValue({
      id: parseInt(installationId),
      account: {
        login: "test-org",
        type: "Organization",
        id: 123456,
        node_id: "MDEyOk9yZ2FuaXphdGlvbjEyMzQ1Ng==",
        avatar_url: "https://avatars.githubusercontent.com/u/123456?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/test-org",
        html_url: "https://github.com/test-org",
        followers_url: "https://api.github.com/users/test-org/followers",
        following_url:
          "https://api.github.com/users/test-org/following{/other_user}",
        gists_url: "https://api.github.com/users/test-org/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/test-org/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/test-org/subscriptions",
        organizations_url: "https://api.github.com/users/test-org/orgs",
        repos_url: "https://api.github.com/users/test-org/repos",
        events_url: "https://api.github.com/users/test-org/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/test-org/received_events",
        site_admin: false,
      },
      repository_selection: "all",
      permissions: {
        contents: "write",
        metadata: "read",
      },
      access_tokens_url: `https://api.github.com/app/installations/${installationId}/access_tokens`,
      repositories_url: `https://api.github.com/installation/repositories`,
      html_url: `https://github.com/apps/test-app/installations/${installationId}`,
      app_id: 123,
      app_slug: "test-app",
      target_id: 123456,
      target_type: "Organization",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      has_multiple_single_files: false,
      single_file_paths: [],
      single_file_name: null,
      suspended_at: null,
      suspended_by: null,
      events: [],
    });

    // Clean up any existing test installations
    initServices();
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.installationId, parseInt(installationId)));
  });

  describe("setup_action=install", () => {
    it("should store installation and redirect to settings", async () => {
      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=connected",
      );

      // Verify installation was stored in database
      const storedInstallations = await globalThis.services.db
        .select()
        .from(githubInstallations)
        .where(
          eq(githubInstallations.installationId, parseInt(installationId)),
        );

      expect(storedInstallations).toHaveLength(1);
      expect(storedInstallations[0]).toMatchObject({
        userId,
        installationId: parseInt(installationId),
        accountName: "test-org",
      });
    });

    it("should update existing installation on conflict", async () => {
      // First, create an installation using utility function
      await createTestGitHubInstallation(
        "different-user",
        parseInt(installationId),
        "old-account-name",
      );

      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=connected",
      );

      // Verify installation was updated
      const storedInstallations = await globalThis.services.db
        .select()
        .from(githubInstallations)
        .where(
          eq(githubInstallations.installationId, parseInt(installationId)),
        );

      expect(storedInstallations).toHaveLength(1);
      expect(storedInstallations[0]).toMatchObject({
        userId, // Should be updated to current user
        installationId: parseInt(installationId),
        accountName: "test-org", // Should be updated
      });
    });
  });
});
