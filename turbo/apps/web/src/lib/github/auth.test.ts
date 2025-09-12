import { describe, it, expect, beforeEach, vi } from "vitest";
import { getInstallationToken } from "./auth";

// Mock @octokit/auth-app
const mockAuth = vi.fn();
vi.mock("@octokit/auth-app", () => ({
  createAppAuth: vi.fn(() => mockAuth),
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

describe("GitHub Auth", () => {
  const installationId = 12345;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      token: "test-installation-token",
    });
  });

  describe("getInstallationToken", () => {
    it("should fetch a token", async () => {
      const token = await getInstallationToken(installationId);

      expect(token).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledWith({
        type: "installation",
        installationId,
      });
    });

    it("should fetch new token on each call", async () => {
      const token1 = await getInstallationToken(installationId);
      const token2 = await getInstallationToken(installationId);

      expect(token1).toBe("test-installation-token");
      expect(token2).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledTimes(2);
    });
  });
});