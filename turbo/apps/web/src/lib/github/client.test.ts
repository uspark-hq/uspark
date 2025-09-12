import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAppOctokit,
  createInstallationOctokit,
  getInstallationDetails,
} from "./client";

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

  return {
    App: vi.fn().mockImplementation(() => ({
      getInstallationOctokit: vi.fn().mockResolvedValue(mockOctokit),
    })),
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

// Mock init-services
vi.mock("../init-services", () => ({
  initServices: vi.fn(() => {
    globalThis.services = {
      env: {
        GH_APP_ID: "test-app-id",
        GH_APP_PRIVATE_KEY: "test-private-key",
        GH_WEBHOOK_SECRET: "test-webhook-secret",
      },
    } as never;
  }),
}));

describe("GitHub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAppOctokit", () => {
    it("should create an App client", () => {
      const app = createAppOctokit();
      expect(app).toBeDefined();
    });
  });

  describe("createInstallationOctokit", () => {
    it("should create an installation client", async () => {
      const installationId = 12345;
      const octokit = await createInstallationOctokit(installationId);

      expect(octokit).toBeDefined();

      const { getInstallationToken } = await import("./auth");
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