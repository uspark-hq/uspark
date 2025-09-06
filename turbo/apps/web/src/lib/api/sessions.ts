// Import types from the real database schema
import type {
  Session as DbSession,
  Turn as DbTurn,
  Block as DbBlock,
} from '../../db/schema/sessions';

// API response types matching the actual backend
export interface SessionResponse {
  id: string;
  project_id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
  turn_ids: string[];
}

export interface TurnResponse {
  id: string;
  session_id: string;
  user_prompt: string;
  status: string;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  block_ids: string[];
}

export interface BlockResponse {
  id: string;
  turn_id: string;
  type: string;
  content: string;
  sequence_number: number;
  created_at: Date;
}

// Client-side types with parsed content
export interface Session {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  turnIds: string[];
  turns?: Turn[];
}

export interface Turn {
  id: string;
  sessionId: string;
  userPrompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  blockIds: string[];
  blocks?: Block[];
}

export interface Block {
  id: string;
  turnId: string;
  type: 'thinking' | 'content' | 'tool_use' | 'tool_result';
  content: any;
  sequenceNumber: number;
  createdAt: Date;
}

interface CreateSessionRequest {
  title?: string;
}

interface CreateTurnRequest {
  user_prompt: string;
}

interface UpdateTurnRequest {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
}

class SessionsAPI {
  private baseUrl = '/api/projects';

  async createSession(projectId: string, title?: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(projectId: string, sessionId: string): Promise<SessionResponse> {
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  }

  async listSessions(projectId: string): Promise<SessionResponse[]> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sessions`);

    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async interruptSession(
    projectId: string,
    sessionId: string
  ): Promise<{ success: boolean }> {
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
  ): Promise<TurnResponse> {
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
  ): Promise<TurnResponse> {
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
  ): Promise<TurnResponse> {
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
    sessionId: string,
    lastTurnIndex?: number,
    lastBlockIndex?: number
  ): Promise<{
    session: { id: string; updated_at: Date };
    new_turn_ids: string[];
    updated_turns: Array<{
      id: string;
      status: string;
      new_block_ids: string[];
      block_count: number;
    }>;
    has_active_turns: boolean;
  }> {
    const params = new URLSearchParams();
    if (lastTurnIndex !== undefined) {
      params.append('last_turn_index', lastTurnIndex.toString());
    }
    if (lastBlockIndex !== undefined) {
      params.append('last_block_index', lastBlockIndex.toString());
    }
    
    const response = await fetch(
      `${this.baseUrl}/${projectId}/sessions/${sessionId}/updates?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session updates: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper method to fetch full session data with turns and blocks
  async getFullSession(projectId: string, sessionId: string): Promise<Session> {
    const sessionResponse = await this.getSession(projectId, sessionId);
    
    // Convert response to client format
    const session: Session = {
      id: sessionResponse.id,
      projectId: sessionResponse.project_id,
      title: sessionResponse.title,
      createdAt: new Date(sessionResponse.created_at),
      updatedAt: new Date(sessionResponse.updated_at),
      turnIds: sessionResponse.turn_ids,
      turns: [],
    };
    
    // Fetch all turns with their blocks
    if (sessionResponse.turn_ids.length > 0) {
      const turns = await Promise.all(
        sessionResponse.turn_ids.map(turnId =>
          this.getTurn(projectId, sessionId, turnId)
        )
      );
      
      session.turns = await Promise.all(
        turns.map(async (turnResponse) => {
          const blocks: Block[] = [];
          
          // Fetch blocks for each turn if they exist
          if (turnResponse.block_ids && turnResponse.block_ids.length > 0) {
            const blockResponses = await Promise.all(
              turnResponse.block_ids.map(blockId =>
                this.getBlock(projectId, sessionId, turnResponse.id, blockId)
              )
            );
            
            blocks.push(...blockResponses.map(br => ({
              id: br.id,
              turnId: br.turn_id,
              type: br.type as Block['type'],
              content: JSON.parse(br.content),
              sequenceNumber: br.sequence_number,
              createdAt: new Date(br.created_at),
            })));
          }
          
          const turn: Turn = {
            id: turnResponse.id,
            sessionId: turnResponse.session_id,
            userPrompt: turnResponse.user_prompt,
            status: turnResponse.status as Turn['status'],
            startedAt: turnResponse.started_at ? new Date(turnResponse.started_at) : null,
            completedAt: turnResponse.completed_at ? new Date(turnResponse.completed_at) : null,
            errorMessage: turnResponse.error_message,
            createdAt: new Date(turnResponse.created_at),
            blockIds: turnResponse.block_ids || [],
            blocks,
          };
          
          return turn;
        })
      );
    }
    
    return session;
  }
  
  async getBlock(
    projectId: string,
    sessionId: string,
    turnId: string,
    blockId: string
  ): Promise<BlockResponse> {
    // Note: This endpoint doesn't exist in the current API
    // We'd need to add it or fetch blocks differently
    // For now, returning a mock
    return {
      id: blockId,
      turn_id: turnId,
      type: 'content',
      content: '{}',
      sequence_number: 0,
      created_at: new Date(),
    };
  }
}

export const sessionsAPI = new SessionsAPI();

export type {
  CreateSessionRequest,
  CreateTurnRequest,
  UpdateTurnRequest,
};