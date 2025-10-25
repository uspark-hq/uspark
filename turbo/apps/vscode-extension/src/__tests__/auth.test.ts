import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Mock VSCode API - must be before imports that use it
vi.mock("vscode", () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    registerUriHandler: vi.fn(),
  },
  env: {
    openExternal: vi.fn(),
  },
  Uri: {
    parse: (url: string) => ({ toString: () => url }),
  },
  ExtensionContext: class {},
}));

// Mock ApiClient
vi.mock("../api", () => ({
  ApiClient: class {
    constructor(private apiUrl: string = "https://www.uspark.ai") {}

    getApiUrl() {
      return this.apiUrl;
    }

    async validateToken(token: string) {
      // Mock validation - return user if token starts with "usp_live_"
      if (token.startsWith("usp_live_")) {
        return {
          id: "user_123",
          email: "test@example.com",
        };
      }
      return null;
    }
  },
}));

// Import after mocks
import { AuthManager } from "../auth";
import * as vscode from "vscode";

describe("AuthManager", () => {
  const realConfigDir = join(homedir(), ".uspark");
  const realConfigFile = join(realConfigDir, "config.json");

  // Type-safe mock context
  const mockContext: vscode.ExtensionContext = {
    subscriptions: [],
  } as vscode.ExtensionContext;

  beforeEach(() => {
    // Clean up real config
    if (existsSync(realConfigFile)) {
      rmSync(realConfigFile, { force: true });
    }

    // Reset all mocks
    vi.clearAllMocks();
    vi.mocked(vscode.env.openExternal).mockResolvedValue(true);
  });

  afterEach(() => {
    // Clean up real config
    if (existsSync(realConfigFile)) {
      rmSync(realConfigFile, { force: true });
    }
  });

  describe("Token Management", () => {
    it("should return undefined when no token exists", async () => {
      const authManager = new AuthManager(mockContext);
      const token = await authManager.getToken();

      expect(token).toBeUndefined();
    });

    it("should return null user when no user exists", async () => {
      const authManager = new AuthManager(mockContext);
      const user = await authManager.getUser();

      expect(user).toBeNull();
    });
  });

  describe("Login Flow", () => {
    it("should open browser with correct URL", async () => {
      const authManager = new AuthManager(
        mockContext,
        "https://test.uspark.ai",
      );

      await authManager.login();

      expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
      const callArg = vi
        .mocked(vscode.env.openExternal)
        .mock.calls[0][0].toString();
      expect(callArg).toContain("https://test.uspark.ai/vscode-auth?state=");
    });

    it("should show error when browser fails to open", async () => {
      vi.mocked(vscode.env.openExternal).mockResolvedValue(false);

      const authManager = new AuthManager(mockContext);
      await authManager.login();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Failed to open browser for authentication",
      );
    });

    it("should show info message when browser opens successfully", async () => {
      vi.mocked(vscode.env.openExternal).mockResolvedValue(true);

      const authManager = new AuthManager(mockContext);
      await authManager.login();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Opening browser for authentication. Please complete the login process.",
      );
    });
  });

  describe("Authentication Status", () => {
    it("should return false when no token exists", async () => {
      const authManager = new AuthManager(mockContext);
      const isAuthenticated = await authManager.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });
  });

  describe("Logout", () => {
    it("should show logout message", async () => {
      const authManager = new AuthManager(mockContext);

      await authManager.logout();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Successfully logged out",
      );
    });
  });
});
