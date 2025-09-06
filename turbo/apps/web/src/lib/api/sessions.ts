/**
 * API client for session management
 * Provides typed interfaces for interacting with session endpoints
 * Uses the actual database schema from main branch
 */

import type { 
  Session as DbSession,
  Turn as DbTurn,
  Block as DbBlock 
} from "../../db/schema/sessions";

// Extended types for API responses that include nested data
export interface Session extends Omit<DbSession, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  turns?: Turn[];
}

export interface Turn extends Omit<DbTurn, 'createdAt' | 'startedAt' | 'completedAt'> {
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  blocks?: Block[];
}

export interface Block extends Omit<DbBlock, 'createdAt'> {
  createdAt: string;
  parsedContent?: unknown; // Parsed JSON content
}

export interface CreateSessionRequest {
  projectId: string;
  initialMessage?: string;
}

export interface SessionUpdateResponse {
  session: {
    id: string;
    updated_at: string;
  };
  new_turn_ids: string[];
  updated_turns: Array<{
    id: string;
    status: string;
    new_block_ids: string[];
    block_count: number;
  }>;
  has_active_turns: boolean;
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
    lastTurnIndex?: number,
    lastBlockIndex?: number,
  ): Promise<SessionUpdateResponse> {
    const params = new URLSearchParams();
    if (lastTurnIndex !== undefined && lastTurnIndex >= 0) {
      params.set("last_turn_index", lastTurnIndex.toString());
    }
    if (lastBlockIndex !== undefined && lastBlockIndex >= 0) {
      params.set("last_block_index", lastBlockIndex.toString());
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
