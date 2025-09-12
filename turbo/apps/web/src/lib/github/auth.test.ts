import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getInstallationToken,
  clearTokenCache,
  clearAllTokenCache,
} from "./auth";

// Mock @octokit/auth-app
const mockAuth = vi.fn();
vi.mock("@octokit/auth-app", () => ({
  createAppAuth: vi.fn(() => mockAuth),
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

describe("GitHub Auth", () => {
  const installationId = 12345;

  beforeEach(() => {
    // Clear all caches before each test
    clearAllTokenCache();
    vi.clearAllMocks();

    // Reset the mock auth function
    mockAuth.mockResolvedValue({
      token: "test-installation-token",
    });
  });

  describe("getInstallationToken", () => {
    it("should fetch a new token on first call", async () => {
      const token = await getInstallationToken(installationId);

      expect(token).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledWith({
        type: "installation",
        installationId,
      });
    });

    it("should return cached token on subsequent calls", async () => {
      // First call - should fetch from API
      const token1 = await getInstallationToken(installationId);
      expect(token1).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledTimes(1);

      // Second call - should return from cache
      const token2 = await getInstallationToken(installationId);
      expect(token2).toBe("test-installation-token");

      // Should not have called auth again (cached)
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    it.skip("should refresh token when expired", async () => {
      // First call
      const token1 = await getInstallationToken(installationId);
      expect(token1).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledTimes(1);

      // Mock time passing (more than 55 minutes)
      const originalDateNow = Date.now;
      const mockTime = Date.now() + 56 * 60 * 1000; // 56 minutes later
      Date.now = vi.fn(() => mockTime);

      // Reset mock and set new return value
      mockAuth.mockClear();
      mockAuth.mockResolvedValue({
        token: "refreshed-token",
      });

      // Second call - should fetch new token due to expiry
      const token2 = await getInstallationToken(installationId);
      expect(token2).toBe("refreshed-token");
      expect(mockAuth).toHaveBeenCalledTimes(1);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it.skip("should handle concurrent requests for the same installation", async () => {
      // Reset Date.now to ensure we're not affected by previous test
      Date.now = Date.now.bind(Date);

      // Make multiple concurrent requests
      const promises = [
        getInstallationToken(installationId),
        getInstallationToken(installationId),
        getInstallationToken(installationId),
      ];

      const tokens = await Promise.all(promises);

      // All should return the same token
      expect(tokens[0]).toBe("test-installation-token");
      expect(tokens[1]).toBe("test-installation-token");
      expect(tokens[2]).toBe("test-installation-token");

      // Auth should only be called once (not three times)
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    it("should cache tokens separately for different installations", async () => {
      const installationId2 = 67890;

      // Mock different responses for different installations
      mockAuth.mockImplementation(async ({ installationId: id }) => {
        if (id === installationId) {
          return { token: "token-for-12345" };
        } else if (id === installationId2) {
          return { token: "token-for-67890" };
        }
        return { token: "unknown" };
      });

      // Get tokens for two different installations
      const token1 = await getInstallationToken(installationId);
      const token2 = await getInstallationToken(installationId2);

      expect(token1).toBe("token-for-12345");
      expect(token2).toBe("token-for-67890");

      // Verify both are cached separately
      const token1Again = await getInstallationToken(installationId);
      const token2Again = await getInstallationToken(installationId2);

      expect(token1Again).toBe(token1);
      expect(token2Again).toBe(token2);

      // Auth should be called twice (once for each installation)
      expect(mockAuth).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearTokenCache", () => {
    it("should clear cache for specific installation", async () => {
      // Get and cache a token
      const token1 = await getInstallationToken(installationId);
      expect(token1).toBe("test-installation-token");
      expect(mockAuth).toHaveBeenCalledTimes(1);

      // Clear the cache
      clearTokenCache(installationId);

      // Update mock to return a different token
      mockAuth.mockResolvedValueOnce({
        token: "new-token-after-clear",
      });

      // Next call should fetch a new token
      const token2 = await getInstallationToken(installationId);
      expect(token2).toBe("new-token-after-clear");

      // Auth should have been called again
      expect(mockAuth).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearAllTokenCache", () => {
    it("should clear all cached tokens", async () => {
      const installationId2 = 67890;

      // Cache tokens for multiple installations
      await getInstallationToken(installationId);
      await getInstallationToken(installationId2);
      expect(mockAuth).toHaveBeenCalledTimes(2);

      // Clear all caches
      clearAllTokenCache();

      // Update mock to return different tokens
      mockAuth.mockResolvedValue({
        token: "new-token-after-clear-all",
      });

      // Both should fetch new tokens
      const token1 = await getInstallationToken(installationId);
      const token2 = await getInstallationToken(installationId2);

      expect(token1).toBe("new-token-after-clear-all");
      expect(token2).toBe("new-token-after-clear-all");

      // Auth should have been called two more times
      expect(mockAuth).toHaveBeenCalledTimes(4);
    });
  });
});
