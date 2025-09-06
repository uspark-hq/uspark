interface Turn {
  id: string;
  sessionId: string;
  userInput: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
}

interface Block {
  id: string;
  turnId: string;
  type: 'thinking' | 'tool_use' | 'text' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Session {
  id: string;
  projectId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted';
  turns: Turn[];
  createdAt: string;
  updatedAt: string;
}

interface CreateSessionRequest {
  projectId: string;
}

interface CreateTurnRequest {
  userInput: string;
}

interface UpdateTurnRequest {
  status?: 'running' | 'completed' | 'failed';
  blocks?: Block[];
}

class SessionsAPI {
  private baseUrl = '/api/projects';

  async createSession(projectId: string): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(projectId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  }

  async listSessions(projectId: string): Promise<Session[]> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sessions`);

    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async interruptSession(
    projectId: string,
    sessionId: string
  ): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/interrupt`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to interrupt session: ${response.statusText}`);
    }

    return response.json();
  }

  async createTurn(
    projectId: string,
    sessionId: string,
    data: CreateTurnRequest
  ): Promise<Turn> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/turns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create turn: ${response.statusText}`);
    }

    return response.json();
  }

  async getTurn(
    projectId: string,
    sessionId: string,
    turnId: string
  ): Promise<Turn> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/turns/${turnId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch turn: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTurn(
    projectId: string,
    sessionId: string,
    turnId: string,
    data: UpdateTurnRequest
  ): Promise<Turn> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/turns/${turnId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update turn: ${response.statusText}`);
    }

    return response.json();
  }

  async getSessionUpdates(
    projectId: string,
    sessionId: string
  ): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/updates`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session updates: ${response.statusText}`);
    }

    return response.json();
  }

  async mockExecute(
    projectId: string,
    sessionId: string,
    userInput: string
  ): Promise<void> {
    const response = await fetch(`/api/claude/mock/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        sessionId,
        userInput,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute mock: ${response.statusText}`);
    }
  }
}

export const sessionsAPI = new SessionsAPI();

export type {
  Session,
  Turn,
  Block,
  CreateSessionRequest,
  CreateTurnRequest,
  UpdateTurnRequest,
};