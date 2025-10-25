import { ExtensionContext, Uri, UriHandler, env, window } from "vscode";
import { existsSync, promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { ApiClient } from "./api";

interface AuthConfig {
  token?: string;
  apiUrl?: string;
  user?: {
    id: string;
    email: string;
  };
}

interface PendingAuth {
  state: string;
  timestamp: number;
}

const CONFIG_DIR = join(homedir(), ".uspark");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const STATE_EXPIRY = 5 * 60 * 1000; // 5 minutes

function getDefaultApiUrl(): string {
  // Support environment variable for local development/testing
  return process.env.USPARK_API_URL || "https://www.uspark.ai";
}

export class AuthManager implements UriHandler {
  private pendingAuth: PendingAuth | null = null;
  private api: ApiClient;

  constructor(
    private context: ExtensionContext,
    apiUrl: string = getDefaultApiUrl(),
  ) {
    this.api = new ApiClient(apiUrl);
  }

  /**
   * Handle VSCode URI callbacks
   */
  async handleUri(uri: Uri): Promise<void> {
    // Expected format: vscode://uSpark.uspark-sync/auth-callback?token=xxx&state=xxx
    if (uri.path === "/auth-callback") {
      const params = new URLSearchParams(uri.query);
      const token = params.get("token");
      const state = params.get("state");

      if (!token || !state) {
        void window.showErrorMessage("Invalid authentication callback");
        return;
      }

      // Verify state
      if (!this.verifyState(state)) {
        void window.showErrorMessage(
          "Authentication failed: invalid or expired state",
        );
        return;
      }

      // Clear pending auth
      this.pendingAuth = null;

      // Validate token
      const user = await this.api.validateToken(token);
      if (!user) {
        void window.showErrorMessage("Authentication failed: invalid token");
        return;
      }

      // Save token
      await this.saveToken(token, user);

      void window.showInformationMessage(
        `Successfully logged in as ${user.email}`,
      );
    }
  }

  /**
   * Start authentication flow
   */
  async login(): Promise<void> {
    // Generate state for CSRF protection
    const state = this.generateState();

    // Store pending auth
    this.pendingAuth = {
      state,
      timestamp: Date.now(),
    };

    // Open browser
    const authUrl = `${this.api.getApiUrl()}/vscode-auth?state=${state}`;
    const uri = Uri.parse(authUrl);

    const opened = await env.openExternal(uri);
    if (!opened) {
      void window.showErrorMessage("Failed to open browser for authentication");
      this.pendingAuth = null;
      return;
    }

    void window.showInformationMessage(
      "Opening browser for authentication. Please complete the login process.",
    );
  }

  /**
   * Logout and clear token
   */
  async logout(): Promise<void> {
    await this.clearToken();
    void window.showInformationMessage("Successfully logged out");
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const config = await this.loadConfig();
    if (!config.token) {
      return false;
    }

    // Validate token
    const user = await this.api.validateToken(config.token);
    return user !== null;
  }

  /**
   * Get current token
   */
  async getToken(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.token;
  }

  /**
   * Get current user
   */
  async getUser(): Promise<{ id: string; email: string } | null> {
    const config = await this.loadConfig();
    return config.user || null;
  }

  /**
   * Load config from $HOME/.uspark/config.json
   */
  private async loadConfig(): Promise<AuthConfig> {
    if (!existsSync(CONFIG_FILE)) {
      return {};
    }

    try {
      const content = await fs.readFile(CONFIG_FILE, "utf8");
      return JSON.parse(content);
    } catch (error) {
      console.error("[uSpark] Failed to load config:", error);
      return {};
    }
  }

  /**
   * Save token to config file
   */
  private async saveToken(
    token: string,
    user: { id: string; email: string },
  ): Promise<void> {
    // Ensure config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Load existing config
    const existing = await this.loadConfig();

    // Merge with new data
    const config: AuthConfig = {
      ...existing,
      token,
      apiUrl: this.api.getApiUrl(),
      user,
    };

    // Write config
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");

    // Set file permissions to 0600 (owner read/write only)
    await fs.chmod(CONFIG_FILE, 0o600);
  }

  /**
   * Clear token from config
   */
  private async clearToken(): Promise<void> {
    if (!existsSync(CONFIG_FILE)) {
      return;
    }

    const existing = await this.loadConfig();
    const config: AuthConfig = {
      ...existing,
      token: undefined,
      user: undefined,
    };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Verify state parameter
   */
  private verifyState(state: string): boolean {
    if (!this.pendingAuth) {
      return false;
    }

    // Check if state matches
    if (this.pendingAuth.state !== state) {
      return false;
    }

    // Check if not expired
    const elapsed = Date.now() - this.pendingAuth.timestamp;
    if (elapsed > STATE_EXPIRY) {
      return false;
    }

    return true;
  }
}
