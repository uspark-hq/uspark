import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations, githubRepos } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("POST /api/github/disconnect", () => {
  const testUserId = `test-user-gh-disconnect-${Date.now()}-${process.pid}`;
  const baseInstallationId = Math.floor(Date.now() / 1000); // Use timestamp as base for unique IDs
  
  beforeEach(async () => {
    // Initialize real database connection
    initServices();
    
    // Clean up any existing test data for this test user
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.userId, testUserId));
    
    // Default to authenticated user
    mockAuth.mockResolvedValue({ userId: testUserId } as any);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when no installation found", async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "No GitHub installation found" });
  });

  it("successfully disconnects GitHub installation and deletes repos", async () => {
    // Insert test installation
    const installationId = `install-${testUserId}-1`;
    const ghInstallationId = baseInstallationId + 1;
    await globalThis.services.db
      .insert(githubInstallations)
      .values({
        id: installationId,
        userId: testUserId,
        installationId: ghInstallationId,
        accountName: "test-org",
      });

    // Insert test repos linked to this installation
    const repoId1 = `repo-1-${Date.now()}`;
    const repoId2 = `repo-2-${Date.now()}`;
    await globalThis.services.db
      .insert(githubRepos)
      .values([
        {
          id: repoId1,
          projectId: `project-1-${Date.now()}`,
          installationId: ghInstallationId,
          repoName: "test-repo-1",
          repoId: 111111,
        },
        {
          id: repoId2,
          projectId: `project-2-${Date.now()}`,
          installationId: ghInstallationId,
          repoName: "test-repo-2",
          repoId: 222222,
        },
      ]);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "GitHub account disconnected successfully" });
    
    // Verify installation was deleted
    const remainingInstallations = await globalThis.services.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.id, installationId));
    expect(remainingInstallations).toHaveLength(0);
    
    // Verify repos were deleted
    const remainingRepos = await globalThis.services.db
      .select()
      .from(githubRepos)
      .where(eq(githubRepos.installationId, ghInstallationId));
    expect(remainingRepos).toHaveLength(0);
  });

  it("only disconnects the current user's installation", async () => {
    const otherUserId = `other-user-${Date.now()}`;
    const otherGhInstallationId = baseInstallationId + 100;
    const testGhInstallationId = baseInstallationId + 200;
    
    // Insert installation for another user
    await globalThis.services.db
      .insert(githubInstallations)
      .values({
        id: `install-${otherUserId}-1`,
        userId: otherUserId,
        installationId: otherGhInstallationId,
        accountName: "other-org",
      });

    // Insert installation for test user
    const testInstallationId = `install-${testUserId}-2`;
    await globalThis.services.db
      .insert(githubInstallations)
      .values({
        id: testInstallationId,
        userId: testUserId,
        installationId: testGhInstallationId,
        accountName: "test-org",
      });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Verify only test user's installation was deleted
    const otherUserInstallations = await globalThis.services.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, otherUserId));
    expect(otherUserInstallations).toHaveLength(1);
    
    // Verify test user's installation was deleted
    const testUserInstallations = await globalThis.services.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, testUserId));
    expect(testUserInstallations).toHaveLength(0);
    
    // Clean up other user's data
    await globalThis.services.db
      .delete(githubInstallations)
      .where(eq(githubInstallations.userId, otherUserId));
  });

  it("handles case when installation has no repos", async () => {
    // Insert test installation without any repos
    const ghInstallationId = baseInstallationId + 300;
    await globalThis.services.db
      .insert(githubInstallations)
      .values({
        id: `install-${testUserId}-3`,
        userId: testUserId,
        installationId: ghInstallationId,
        accountName: "test-org-no-repos",
      });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "GitHub account disconnected successfully" });
    
    // Verify installation was deleted
    const remainingInstallations = await globalThis.services.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, testUserId));
    expect(remainingInstallations).toHaveLength(0);
  });
});