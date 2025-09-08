import type { Session } from "../../db/schema/sessions";
import type {
  TurnWithBlocks,
  SessionUpdates,
} from "../../components/chat/types";

/**
 * Session API client functions
 * These functions make real HTTP requests to the backend APIs
 */

class SessionAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "SessionAPIError";
  }
}

// Helper for API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "unknown_error" }));
    throw new SessionAPIError(
      error.error || "API request failed",
      response.status,
      error.error,
    );
  }

  return response.json();
}

// Session APIs
export const sessionAPI = {
  // List all sessions for a project
  async listSessions(projectId: string): Promise<Session[]> {
    return apiCall<Session[]>(`/api/projects/${projectId}/sessions`);
  },

  // Create a new session
  async createSession(projectId: string, title?: string): Promise<Session> {
    return apiCall<Session>(`/api/projects/${projectId}/sessions`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  // Get session details with turn IDs
  async getSession(
    projectId: string,
    sessionId: string,
  ): Promise<Session & { turn_ids: string[] }> {
    return apiCall<Session & { turn_ids: string[] }>(
      `/api/projects/${projectId}/sessions/${sessionId}`,
    );
  },

  // Update session (e.g., title)
  async updateSession(
    projectId: string,
    sessionId: string,
    updates: { title?: string },
  ): Promise<Session> {
    return apiCall<Session>(
      `/api/projects/${projectId}/sessions/${sessionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
  },

  // Get all turns with blocks for a session
  async getTurns(
    projectId: string,
    sessionId: string,
  ): Promise<TurnWithBlocks[]> {
    return apiCall<TurnWithBlocks[]>(
      `/api/projects/${projectId}/sessions/${sessionId}/turns`,
    );
  },

  // Create a new turn (start a new message)
  async createTurn(
    projectId: string,
    sessionId: string,
    userPrompt: string,
  ): Promise<TurnWithBlocks> {
    return apiCall<TurnWithBlocks>(
      `/api/projects/${projectId}/sessions/${sessionId}/turns`,
      {
        method: "POST",
        body: JSON.stringify({ user_prompt: userPrompt }),
      },
    );
  },

  // Get a specific turn with blocks
  async getTurn(
    projectId: string,
    sessionId: string,
    turnId: string,
  ): Promise<TurnWithBlocks> {
    return apiCall<TurnWithBlocks>(
      `/api/projects/${projectId}/sessions/${sessionId}/turns/${turnId}`,
    );
  },

  // Poll for session updates (for real-time updates)
  async getUpdates(
    projectId: string,
    sessionId: string,
  ): Promise<SessionUpdates> {
    return apiCall<SessionUpdates>(
      `/api/projects/${projectId}/sessions/${sessionId}/updates`,
    );
  },

  // Interrupt all running turns in a session
  async interruptSession(
    projectId: string,
    sessionId: string,
  ): Promise<{ interrupted_turn_ids: string[] }> {
    return apiCall<{ interrupted_turn_ids: string[] }>(
      `/api/projects/${projectId}/sessions/${sessionId}/interrupt`,
      {
        method: "POST",
      },
    );
  },
};

// Polling helper for real-time updates
export class SessionPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(
    private projectId: string,
    private sessionId: string,
    private onUpdate: (updates: SessionUpdates) => void,
    private onError?: (error: Error) => void,
    private pollInterval: number = 1000,
  ) {}

  start() {
    this.stop(); // Clear any existing polling
    this.abortController = new AbortController();

    const poll = async () => {
      if (this.abortController?.signal.aborted) return;

      try {
        const updates = await sessionAPI.getUpdates(
          this.projectId,
          this.sessionId,
        );
        this.onUpdate(updates);

        // Stop polling if no active turns
        if (!updates.has_active_turns) {
          this.stop();
        }
      } catch (error) {
        if (this.onError) {
          this.onError(error as Error);
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval
    this.intervalId = setInterval(poll, this.pollInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isRunning() {
    return this.intervalId !== null;
  }
}
