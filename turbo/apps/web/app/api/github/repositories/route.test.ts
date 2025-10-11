import { GET } from "./route";
import { auth } from "@clerk/nextjs/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";
import { createInstallationOctokit } from "../../../../src/lib/github/client";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub client
vi.mock("../../../../src/lib/github/client", () => ({
  createInstallationOctokit: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("GET /api/github/repositories", () => {
  const testUserId = `test-user-repos-${Date.now()}-${process.pid}`;
  const baseInstallationId = Math.floor(Date.now() / 1000);

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
  });

  it("returns empty array when user has no installations", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repositories).toEqual([]);
  });

  it("returns repositories from user installations", async () => {
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
              name: "repo1",
              full_name: "testuser/repo1",
              private: false,
              html_url: "https://github.com/testuser/repo1",
            },
            {
              id: 101,
              name: "repo2",
              full_name: "testuser/repo2",
              private: true,
              html_url: "https://github.com/testuser/repo2",
            },
          ],
        },
      }),
    };

    vi.mocked(createInstallationOctokit).mockResolvedValue(
      mockOctokit as never,
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repositories).toHaveLength(2);
    expect(data.repositories).toEqual([
      {
        id: 100,
        name: "repo1",
        fullName: "testuser/repo1",
        installationId: baseInstallationId,
        private: false,
        url: "https://github.com/testuser/repo1",
      },
      {
        id: 101,
        name: "repo2",
        fullName: "testuser/repo2",
        installationId: baseInstallationId,
        private: true,
        url: "https://github.com/testuser/repo2",
      },
    ]);
  });

  it("returns repositories from multiple installations", async () => {
    // Create multiple installations
    await globalThis.services.db.insert(githubInstallations).values([
      {
        userId: testUserId,
        installationId: baseInstallationId,
        accountName: "testuser",
      },
      {
        userId: testUserId,
        installationId: baseInstallationId + 1,
        accountName: "testorg",
      },
    ]);

    // Mock GitHub API responses
    const mockOctokit1 = {
      request: vi.fn().mockResolvedValue({
        data: {
          repositories: [
            {
              id: 100,
              name: "user-repo",
              full_name: "testuser/user-repo",
              private: false,
              html_url: "https://github.com/testuser/user-repo",
            },
          ],
        },
      }),
    };

    const mockOctokit2 = {
      request: vi.fn().mockResolvedValue({
        data: {
          repositories: [
            {
              id: 200,
              name: "org-repo",
              full_name: "testorg/org-repo",
              private: true,
              html_url: "https://github.com/testorg/org-repo",
            },
          ],
        },
      }),
    };

    vi.mocked(createInstallationOctokit)
      .mockResolvedValueOnce(mockOctokit1 as never)
      .mockResolvedValueOnce(mockOctokit2 as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repositories).toHaveLength(2);
    expect(data.repositories[0]).toMatchObject({
      id: 100,
      name: "user-repo",
      installationId: baseInstallationId,
    });
    expect(data.repositories[1]).toMatchObject({
      id: 200,
      name: "org-repo",
      installationId: baseInstallationId + 1,
    });
  });
});
