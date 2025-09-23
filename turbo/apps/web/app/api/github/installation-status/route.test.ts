import { GET } from "./route";
import { auth } from "@clerk/nextjs/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestGitHubInstallation } from "../../../../src/test/db-test-utils";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("GET /api/github/installation-status", () => {
  const testUserId = `test-user-gh-status-${Date.now()}-${process.pid}`;
  const baseInstallationId = Math.floor(Date.now() / 1000); // Use timestamp as base for unique IDs

  beforeEach(async () => {
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
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns null when no installation found", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ installation: null });
  });

  it("returns installation details when installation exists", async () => {
    // Insert test installation
    const ghInstallationId = baseInstallationId + 1;
    await globalThis.services.db.insert(githubInstallations).values({
      id: `install-${testUserId}-1`,
      userId: testUserId,
      installationId: ghInstallationId,
      accountName: "test-org",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installation).toMatchObject({
      installationId: ghInstallationId,
      accountName: "test-org",
      accountType: "user",
      repositorySelection: "selected",
    });
    expect(data.installation.createdAt).toBeDefined();
  });

  it("returns only the current user's installation", async () => {
    const otherUserId = `other-user-${Date.now()}`;
    const otherGhInstallationId = baseInstallationId + 100;
    const testGhInstallationId = baseInstallationId + 200;

    // Insert installation for another user
    await globalThis.services.db.insert(githubInstallations).values({
      id: `install-${otherUserId}-1`,
      userId: otherUserId,
      installationId: otherGhInstallationId,
      accountName: "other-org",
    });

    // Insert installation for test user
    await globalThis.services.db.insert(githubInstallations).values({
      id: `install-${testUserId}-2`,
      userId: testUserId,
      installationId: testGhInstallationId,
      accountName: "test-org",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installation.installationId).toBe(testGhInstallationId);
    expect(data.installation.accountName).toBe("test-org");

    // Clean up other user's data
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.userId, otherUserId));
  });
});
