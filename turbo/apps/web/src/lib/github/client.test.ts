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
    hook: {
      error: vi.fn(),
    },
  };

  return {
    App: vi.fn().mockImplementation(() => ({
      getInstallationOctokit: vi.fn().mockResolvedValue(mockOctokit),
    })),
  };
});

// Mock @octokit/core
vi.mock("@octokit/core", () => {
  const mockOctokit = {
    request: vi.fn(),
    hook: {
      error: vi.fn(),
    },
  };

  return {
    Octokit: vi.fn().mockImplementation(() => mockOctokit),
  };
});

// Mock auth module
vi.mock("./auth", () => ({
  getInstallationToken: vi.fn().mockResolvedValue("test-installation-token"),
  clearTokenCache: vi.fn(),
}));

// Mock init-services
vi.mock("../init-services", () => ({
  initServices: vi.fn(() => {
    // Setup globalThis.services for tests
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
    it("should create an App client with correct credentials", async () => {
      const app = createAppOctokit();

      expect(app).toBeDefined();

      // Verify App constructor was called with correct config
      const { App } = await import("@octokit/app");
      expect(App).toHaveBeenCalledWith({
        appId: "test-app-id",
        privateKey: "test-private-key",
      });
    });
  });

  describe("createInstallationOctokit", () => {
    it("should create an installation client with access token", async () => {
      const installationId = 12345;
      const octokit = await createInstallationOctokit(installationId);

      expect(octokit).toBeDefined();

      // Verify token was fetched
      const { getInstallationToken } = await import("./auth");
      expect(getInstallationToken).toHaveBeenCalledWith(installationId);

      // Verify Octokit was created with the token
      const { Octokit } = (await import("@octokit/core")) as unknown as {
        Octokit: ReturnType<typeof vi.fn>;
      };
      expect(Octokit).toHaveBeenCalledWith({
        auth: "test-installation-token",
      });
    });

    it("should setup error hook for token refresh", async () => {
      const installationId = 12345;
      const octokit = await createInstallationOctokit(installationId);

      // Verify error hook was setup
      expect(octokit.hook.error).toHaveBeenCalledWith(
        "request",
        expect.any(Function),
      );
    });

    it("should refresh token on 401 error", async () => {
      const installationId = 12345;

      // Create the client
      const octokit = await createInstallationOctokit(installationId);

      // Get the error handler that was registered
      const errorCall = vi.mocked(octokit.hook.error).mock.calls[0];
      if (!errorCall) throw new Error("Error hook not registered");
      const errorHandler = errorCall[1];

      // Mock error and options
      const error = { status: 401 } as Error & { status: number };
      const options = {
        request: {
          headers: {
            authorization: "token old-token",
          },
        },
      };

      // Mock fresh token
      const { getInstallationToken, clearTokenCache } = await import("./auth");
      vi.mocked(getInstallationToken).mockResolvedValueOnce("fresh-token");

      // Call the error handler
      await errorHandler(error, options);

      // Verify cache was cleared and new token was fetched
      expect(clearTokenCache).toHaveBeenCalledWith(installationId);
      expect(getInstallationToken).toHaveBeenCalledWith(installationId);

      // Verify the authorization header was updated
      expect(options.request.headers.authorization).toBe("token fresh-token");
    });

    it("should throw non-401 errors", async () => {
      const installationId = 12345;

      // Create the client
      const octokit = await createInstallationOctokit(installationId);

      // Get the error handler that was registered
      const errorCall = vi.mocked(octokit.hook.error).mock.calls[0];
      if (!errorCall) throw new Error("Error hook not registered");
      const errorHandler = errorCall[1];

      // Mock non-401 error
      const error = { status: 500, message: "Server error" } as Error & {
        status: number;
      };
      const options = {
        request: {
          headers: {
            authorization: "token test-token",
          },
        },
      };

      // Call the error handler and expect it to throw
      await expect(errorHandler(error, options)).rejects.toThrow();
    });
  });

  describe("getInstallationDetails", () => {
    it("should fetch installation details from GitHub", async () => {
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

      // Verify App was created
      const { App } = await import("@octokit/app");
      expect(App).toHaveBeenCalled();

      // Verify getInstallationOctokit was called with correct ID
      const mockApp = vi.mocked(App).mock.results[0]?.value;
      expect(mockApp?.getInstallationOctokit).toHaveBeenCalledWith(
        installationId,
      );
    });

    it("should handle API errors gracefully", async () => {
      const installationId = 12345;

      // Mock API error
      const { App } = await import("@octokit/app");
      const mockOctokit = {
        request: vi.fn().mockRejectedValue(new Error("API Error")),
      };

      vi.mocked(App).mockImplementationOnce(
        () =>
          ({
            getInstallationOctokit: vi.fn().mockResolvedValue(mockOctokit),
          }) as unknown as InstanceType<typeof App>,
      );

      // Expect the error to be thrown
      await expect(getInstallationDetails(installationId)).rejects.toThrow(
        "API Error",
      );
    });
  });
});
