import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
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
  const installationId = "12345";

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
      },
      repository_selection: "all",
      permissions: {
        contents: "write",
        metadata: "read",
      },
    });

    // Clean up any existing test installations
    initServices();
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.installationId, parseInt(installationId)));
  });

  describe("authentication", () => {
    it("should redirect to sign-in when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const url =
        "http://localhost:3000/api/github/setup?setup_action=install&installation_id=12345";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/sign-in",
      );
    });
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
      // First, insert an installation
      await globalThis.services.db.insert(githubInstallations).values({
        userId: "different-user",
        installationId: parseInt(installationId),
        accountName: "old-account-name",
      });

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

    it("should redirect to error when installation_id is missing", async () => {
      const url = "http://localhost:3000/api/github/setup?setup_action=install";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=error&message=missing_installation_id",
      );
    });

    it("should use fallback account name when GitHub API fails", async () => {
      // Mock GitHub API failure
      mockGetInstallationDetails.mockRejectedValueOnce(new Error("API Error"));

      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=connected",
      );

      // Verify fallback account name was used
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
        accountName: `installation-${installationId}`, // Fallback name
      });
    });
  });

  describe("setup_action=request", () => {
    it("should redirect to pending status", async () => {
      const url = "http://localhost:3000/api/github/setup?setup_action=request";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=pending",
      );
    });
  });

  describe("setup_action=update", () => {
    it("should redirect to updated status", async () => {
      const url = "http://localhost:3000/api/github/setup?setup_action=update";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=updated",
      );
    });
  });

  describe("invalid setup_action", () => {
    it("should redirect to error for unknown action", async () => {
      const url = "http://localhost:3000/api/github/setup?setup_action=unknown";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=error&message=unknown_action",
      );
    });

    it("should redirect to error when setup_action is missing", async () => {
      const url = "http://localhost:3000/api/github/setup";
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=error&message=unknown_action",
      );
    });
  });

  describe("state parameter validation", () => {
    it("should redirect to error when state doesn't match userId", async () => {
      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}&state=different-user`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=error&message=invalid_state",
      );
    });

    it("should proceed when state matches userId", async () => {
      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}&state=${userId}`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=connected",
      );
    });

    it("should proceed when state is not provided", async () => {
      const url = `http://localhost:3000/api/github/setup?setup_action=install&installation_id=${installationId}`;
      const mockRequest = new NextRequest(url);

      const response = await GET(mockRequest);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/settings?github=connected",
      );
    });
  });
});
