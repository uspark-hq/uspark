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
  const testConfigDir = join(homedir(), ".uspark-test");
  const testConfigFile = join(testConfigDir, "config.json");
  const realConfigDir = join(homedir(), ".uspark");
  const realConfigFile = join(realConfigDir, "config.json");

  // Mock context
  const mockContext = {
    subscriptions: [],
  } as any;

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clean up real config (since tests may write there)
    if (existsSync(realConfigFile)) {
      rmSync(realConfigFile, { force: true });
    }

    // Reset all mocks
    vi.clearAllMocks();
    vi.mocked(vscode.env.openExternal).mockResolvedValue(true);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Clean up real config
    if (existsSync(realConfigFile)) {
      rmSync(realConfigFile, { force: true });
    }
  });

  describe("Token Storage", () => {
    it("should return empty config when file does not exist", async () => {
      const authManager = new AuthManager(mockContext);
      const token = await authManager.getToken();

      expect(token).toBeUndefined();
    });

    it("should save and retrieve token", async () => {
      const authManager = new AuthManager(mockContext);

      // Save a token using the private method
      const saveToken = (authManager as any).saveToken.bind(authManager);
      await saveToken("usp_live_test_token_123", {
        id: "user_123",
        email: "test@example.com",
      });

      // Retrieve using public method
      const token = await authManager.getToken();
      const user = await authManager.getUser();

      expect(token).toBe("usp_live_test_token_123");
      expect(user?.email).toBe("test@example.com");
    });
  });

  describe("State Generation and Validation", () => {
    it("should generate unique state values", async () => {
      const authManager = new AuthManager(mockContext);

      // Generate state by calling login (which generates state)
      await authManager.login();
      const pendingAuth1 = (authManager as any).pendingAuth;

      // Create new instance and generate again
      const authManager2 = new AuthManager(mockContext);
      await authManager2.login();
      const pendingAuth2 = (authManager2 as any).pendingAuth;

      expect(pendingAuth1.state).toBeDefined();
      expect(pendingAuth2.state).toBeDefined();
      expect(pendingAuth1.state).not.toBe(pendingAuth2.state);
    });

    it("should validate correct state", async () => {
      const authManager = new AuthManager(mockContext);

      // Set up pending auth
      const state = "test_state_123";
      (authManager as any).pendingAuth = {
        state,
        timestamp: Date.now(),
      };

      const verifyState = (authManager as any).verifyState.bind(authManager);
      const isValid = verifyState(state);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect state", async () => {
      const authManager = new AuthManager(mockContext);

      // Set up pending auth
      (authManager as any).pendingAuth = {
        state: "correct_state",
        timestamp: Date.now(),
      };

      const verifyState = (authManager as any).verifyState.bind(authManager);
      const isValid = verifyState("wrong_state");

      expect(isValid).toBe(false);
    });

    it("should reject expired state", async () => {
      const authManager = new AuthManager(mockContext);

      // Set up pending auth with old timestamp (6 minutes ago)
      const state = "test_state";
      (authManager as any).pendingAuth = {
        state,
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      };

      const verifyState = (authManager as any).verifyState.bind(authManager);
      const isValid = verifyState(state);

      expect(isValid).toBe(false);
    });

    it("should reject when no pending auth", async () => {
      const authManager = new AuthManager(mockContext);

      const verifyState = (authManager as any).verifyState.bind(authManager);
      const isValid = verifyState("any_state");

      expect(isValid).toBe(false);
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
