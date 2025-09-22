import { describe, it, expect, beforeEach, vi } from "vitest";
import { getInstallationToken } from "./auth";

// Mock @octokit/auth-app because it requires a valid RSA private key
// Test environment only has a placeholder key, not a real RSA key
// This is acceptable as we're testing our logic, not GitHub's JWT generation
const mockAuth = vi.fn();
vi.mock("@octokit/auth-app", () => ({
  createAppAuth: vi.fn(() => mockAuth),
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
