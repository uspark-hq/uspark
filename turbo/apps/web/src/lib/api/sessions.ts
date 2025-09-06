/**
 * API client for session management
 * Provides typed interfaces for interacting with session endpoints
 */

export interface Session {
  id: string;
  projectId: string;
  status: "idle" | "running" | "completed" | "failed" | "interrupted";
  createdAt: string;
  updatedAt: string;
  turns: Turn[];
}

export interface Turn {
  id: string;
  sessionId: string;
  status: "running" | "completed" | "failed";
  userMessage: string;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
}

export interface Block {
  id: string;
  turnId: string;
  type: "thinking" | "tool_use" | "content" | "error";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSessionRequest {
  projectId: string;
  initialMessage?: string;
}

export interface SessionUpdateResponse {
  session: Session;
  hasNewUpdates: boolean;
  lastUpdateTimestamp: string;
}

export class SessionApiClient {
  private baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  /**
   * Get session details including all turns and blocks
   */
  async getSession(projectId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get session updates (optimized for polling)
   */
  async getSessionUpdates(
    projectId: string,
    sessionId: string,
    lastUpdateTimestamp?: string,
  ): Promise<SessionUpdateResponse> {
    const params = new URLSearchParams();
    if (lastUpdateTimestamp) {
      params.set("since", lastUpdateTimestamp);
    }

    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/sessions/${sessionId}/updates?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch session updates: ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/projects/${request.projectId}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initialMessage: request.initialMessage,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Interrupt a running session
   */
  async interruptSession(projectId: string, sessionId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/sessions/${sessionId}/interrupt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to interrupt session: ${response.statusText}`);
    }
  }

  /**
   * Create a new turn in a session
   */
  async createTurn(
    projectId: string,
    sessionId: string,
    message: string,
  ): Promise<Turn> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/sessions/${sessionId}/turns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create turn: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance for convenience
export const sessionApi = new SessionApiClient();
