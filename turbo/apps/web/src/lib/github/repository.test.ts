import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRepositoryDetails, RepositoryFetchError } from "./repository";

// Mock the GitHub client
vi.mock("./client", () => ({
  createInstallationOctokit: vi.fn(),
}));

// Mock Octokit
vi.mock("@octokit/core", () => ({
  Octokit: vi.fn(),
}));

import { createInstallationOctokit } from "./client";
import { Octokit } from "@octokit/core";

const mockCreateInstallationOctokit = vi.mocked(createInstallationOctokit);
const MockOctokit = vi.mocked(Octokit);

describe("getRepositoryDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should throw RepositoryFetchError for invalid URL format (missing repo)", async () => {
      await expect(getRepositoryDetails("owner/", null)).rejects.toThrow(
        RepositoryFetchError,
      );

      try {
        await getRepositoryDetails("owner/", null);
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryFetchError);
        expect((error as RepositoryFetchError).repoUrl).toBe("owner/");
        expect((error as RepositoryFetchError).message).toContain(
          "Invalid repository URL format",
        );
      }
    });

    it("should throw RepositoryFetchError for invalid URL format (missing owner)", async () => {
      await expect(getRepositoryDetails("/repo", null)).rejects.toThrow(
        RepositoryFetchError,
      );
    });

    it("should throw RepositoryFetchError for invalid URL format (no slash)", async () => {
      await expect(getRepositoryDetails("invalid", null)).rejects.toThrow(
        RepositoryFetchError,
      );
    });
  });

  describe("Authenticated Requests (with installationId)", () => {
    it("should use installation octokit when installationId is provided", async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 123,
            name: "test-repo",
            full_name: "owner/test-repo",
            stargazers_count: 42,
            html_url: "https://github.com/owner/test-repo",
            private: true,
          },
        }),
      };

      mockCreateInstallationOctokit.mockResolvedValue(
        mockOctokit as unknown as Awaited<
          ReturnType<typeof createInstallationOctokit>
        >,
      );

      const result = await getRepositoryDetails("owner/test-repo", 789);

      expect(mockCreateInstallationOctokit).toHaveBeenCalledWith(789);
      expect(mockOctokit.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}",
        {
          owner: "owner",
          repo: "test-repo",
        },
      );
      expect(result).toEqual({
        id: 123,
        name: "test-repo",
        fullName: "owner/test-repo",
        stargazersCount: 42,
        url: "https://github.com/owner/test-repo",
        private: true,
      });
    });
  });

  describe("Unauthenticated Requests (public repos)", () => {
    it("should use Octokit without auth when installationId is not provided", async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 456,
            name: "public-repo",
            full_name: "org/public-repo",
            stargazers_count: 1000,
            html_url: "https://github.com/org/public-repo",
            private: false,
          },
        }),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      const result = await getRepositoryDetails("org/public-repo", null);

      expect(MockOctokit).toHaveBeenCalled();
      expect(mockOctokit.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}",
        {
          owner: "org",
          repo: "public-repo",
        },
      );
      expect(result).toEqual({
        id: 456,
        name: "public-repo",
        fullName: "org/public-repo",
        stargazersCount: 1000,
        url: "https://github.com/org/public-repo",
        private: false,
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw RepositoryFetchError with 404 when repository not found", async () => {
      const mockOctokit = {
        request: vi.fn().mockRejectedValue({
          status: 404,
          message: "Not Found",
        }),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      await expect(
        getRepositoryDetails("owner/nonexistent", null),
      ).rejects.toThrow(RepositoryFetchError);

      try {
        await getRepositoryDetails("owner/nonexistent", null);
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryFetchError);
        expect((error as RepositoryFetchError).statusCode).toBe(404);
        expect((error as RepositoryFetchError).repoUrl).toBe(
          "owner/nonexistent",
        );
        expect((error as RepositoryFetchError).message).toContain("not found");
      }
    });

    it("should throw RepositoryFetchError with 403 when access is denied", async () => {
      const mockOctokit = {
        request: vi.fn().mockRejectedValue({
          status: 403,
          message: "Forbidden",
        }),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      await expect(
        getRepositoryDetails("owner/private-repo", null),
      ).rejects.toThrow(RepositoryFetchError);

      try {
        await getRepositoryDetails("owner/private-repo", null);
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryFetchError);
        expect((error as RepositoryFetchError).statusCode).toBe(403);
        expect((error as RepositoryFetchError).message).toContain(
          "Access denied",
        );
      }
    });

    it("should throw RepositoryFetchError for other HTTP errors", async () => {
      const mockOctokit = {
        request: vi.fn().mockRejectedValue({
          status: 500,
          message: "Internal Server Error",
        }),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      await expect(
        getRepositoryDetails("owner/error-repo", null),
      ).rejects.toThrow(RepositoryFetchError);

      try {
        await getRepositoryDetails("owner/error-repo", null);
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryFetchError);
        expect((error as RepositoryFetchError).statusCode).toBe(500);
        expect((error as RepositoryFetchError).message).toContain(
          "GitHub API error",
        );
      }
    });

    it("should throw RepositoryFetchError for network errors", async () => {
      const mockOctokit = {
        request: vi
          .fn()
          .mockRejectedValue(new Error("Network connection failed")),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      await expect(
        getRepositoryDetails("owner/network-error", null),
      ).rejects.toThrow(RepositoryFetchError);

      try {
        await getRepositoryDetails("owner/network-error", null);
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryFetchError);
        expect((error as RepositoryFetchError).statusCode).toBeUndefined();
        expect((error as RepositoryFetchError).message).toContain(
          "Failed to fetch repository details",
        );
        expect((error as RepositoryFetchError).cause).toBeInstanceOf(Error);
      }
    });
  });

  describe("Return Value Structure", () => {
    it("should return correctly shaped RepositoryDetails object", async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: {
            id: 789,
            name: "full-test",
            full_name: "org/full-test",
            stargazers_count: 5432,
            html_url: "https://github.com/org/full-test",
            private: false,
          },
        }),
      };

      MockOctokit.mockImplementation(
        () => mockOctokit as unknown as InstanceType<typeof Octokit>,
      );

      const result = await getRepositoryDetails("org/full-test", null);

      // Verify all fields are present
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("fullName");
      expect(result).toHaveProperty("stargazersCount");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("private");

      // Verify types
      expect(typeof result.id).toBe("number");
      expect(typeof result.name).toBe("string");
      expect(typeof result.fullName).toBe("string");
      expect(typeof result.stargazersCount).toBe("number");
      expect(typeof result.url).toBe("string");
      expect(typeof result.private).toBe("boolean");
    });
  });
});
