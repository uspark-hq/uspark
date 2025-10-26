import { logger } from "./logger";

interface User {
  id: string;
  email: string;
}

/**
 * Get default API URL for the extension
 *
 * Note: Unlike server-side code, this extension intentionally uses a fallback URL
 * for better user experience. Users shouldn't need to configure USPARK_API_URL
 * for normal usage. The environment variable is primarily for:
 * - Local development and testing
 * - Enterprise deployments with custom API endpoints
 *
 * This is an acceptable exception to the fail-fast principle (spec/bad-smell.md #11)
 * because:
 * 1. VSCode extensions are client-side tools where UX matters more than strict config
 * 2. The production URL is a reasonable default for 99% of users
 * 3. Advanced users can still override via USPARK_API_URL
 * 4. Missing URL in tests is caught by explicit apiUrl parameter in tests
 */
function getDefaultApiUrl(): string {
  return process.env.USPARK_API_URL || "https://www.uspark.ai";
}

export class ApiClient {
  constructor(private apiUrl: string = getDefaultApiUrl()) {}

  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Validate token and get user info
   * Returns user info if token is valid, null otherwise
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { userId: string; email: string };
      return {
        id: data.userId,
        email: data.email,
      };
    } catch (error) {
      logger.error("Failed to validate token", error);
      return null;
    }
  }

  /**
   * Sync project files
   * TODO: Implement actual sync logic
   */
  async sync(token: string, projectId: string, workDir: string): Promise<void> {
    // TODO: Implement pull and push logic
    logger.info(`Sync not yet implemented for project ${projectId}`);
  }
}
