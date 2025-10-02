import { describe, it, expect, beforeEach, vi } from "vitest";
import { createInstallationOctokit, getInstallationDetails } from "./client";
import { getInstallationToken } from "./auth";

// Mock @octokit/app
vi.mock("@octokit/app", () => {
  const mockOctokit = {
    request: vi.fn().mockResolvedValue({
      data: {
        id: 12345,
        account: {
          login: "test-org",
          type: "Organization",
        },
        repository_selection: "all",
        permissions: {
          contents: "write",
          metadata: "read",
        },
      },
    }),
  };

  const mockApp = {
    getInstallationOctokit: vi.fn().mockResolvedValue(mockOctokit),
    octokit: {
      request: vi.fn().mockResolvedValue({
        data: {
          id: 12345,
          account: {
            login: "test-org",
            type: "Organization",
          },
          repository_selection: "all",
          permissions: {
            contents: "write",
            metadata: "read",
          },
        },
      }),
    },
  };

  return {
    App: vi.fn().mockImplementation(() => mockApp),
  };
});

// Mock @octokit/core
vi.mock("@octokit/core", () => ({
  Octokit: vi.fn().mockImplementation(() => ({})),
}));

// Mock auth module
vi.mock("./auth", () => ({
  getInstallationToken: vi.fn().mockResolvedValue("test-installation-token"),
}));

// Don't mock init-services - use real services with test environment variables

describe("GitHub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInstallationOctokit", () => {
    it("should create an installation client", async () => {
      const installationId = 12345;
      const octokit = await createInstallationOctokit(installationId);

      expect(octokit).toBeDefined();

      expect(getInstallationToken).toHaveBeenCalledWith(installationId);
    });
  });

  describe("getInstallationDetails", () => {
    it("should fetch installation details", async () => {
      const installationId = 12345;
      const details = await getInstallationDetails(installationId);

      expect(details).toEqual({
        id: 12345,
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
    });
  });
});
