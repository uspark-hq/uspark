interface User {
  id: string;
  email: string;
}

export class ApiClient {
  constructor(private apiUrl: string = "https://www.uspark.ai") {}

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
      console.error("[Uspark] Failed to validate token:", error);
      return null;
    }
  }

  /**
   * Sync project files
   * TODO: Implement actual sync logic
   */
  async sync(token: string, projectId: string, workDir: string): Promise<void> {
    // TODO: Implement pull and push logic
    console.log(`[Uspark] Sync not yet implemented for project ${projectId}`);
  }
}
