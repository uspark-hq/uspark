import type { Session, Turn, Block } from '../../lib/api/sessions';
import { BlockFactory } from '../../lib/sessions/blocks';

export const mockBlock = {
  thinking: (turnId: string): Block => ({
    id: `block-thinking-${Math.random()}`,
    turnId,
    type: 'thinking',
    content: { text: 'Analyzing the request and planning the approach...' },
    sequenceNumber: 0,
    createdAt: new Date(),
  }),
  
  toolUse: (turnId: string, toolName: string): Block => ({
    id: `block-tool-${Math.random()}`,
    turnId,
    type: 'tool_use',
    content: {
      tool_name: toolName,
      parameters: {},
      tool_use_id: `tool_${Math.random()}`,
    },
    sequenceNumber: 1,
    createdAt: new Date(),
  }),
  
  content: (turnId: string, text: string): Block => ({
    id: `block-content-${Math.random()}`,
    turnId,
    type: 'content',
    content: { text },
    sequenceNumber: 2,
    createdAt: new Date(),
  }),
  
  toolResult: (turnId: string, toolUseId: string, result: string, error?: string): Block => ({
    id: `block-result-${Math.random()}`,
    turnId,
    type: 'tool_result',
    content: {
      tool_use_id: toolUseId,
      result,
      error: error || null,
    },
    sequenceNumber: 3,
    createdAt: new Date(),
  }),
};

export const mockTurn = {
  running: (sessionId: string, userPrompt: string): Turn => {
    const turnId = `turn-running-${Math.random()}`;
    return {
      id: turnId,
      sessionId,
      userPrompt,
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      createdAt: new Date(),
      blockIds: [],
      blocks: [
        mockBlock.thinking(turnId),
        mockBlock.toolUse(turnId, 'grep'),
      ],
    };
  },
  
  completed: (sessionId: string, userPrompt: string): Turn => {
    const turnId = `turn-completed-${Math.random()}`;
    const startTime = new Date(Date.now() - 60000);
    const endTime = new Date(Date.now() - 30000);
    return {
      id: turnId,
      sessionId,
      userPrompt,
      status: 'completed',
      startedAt: startTime,
      completedAt: endTime,
      errorMessage: null,
      createdAt: startTime,
      blockIds: [],
      blocks: [
        mockBlock.thinking(turnId),
        mockBlock.toolUse(turnId, 'read'),
        mockBlock.toolUse(turnId, 'edit'),
        mockBlock.content(turnId, 'Successfully updated the file with error handling.'),
      ],
    };
  },
  
  failed: (sessionId: string, userPrompt: string): Turn => {
    const turnId = `turn-failed-${Math.random()}`;
    const startTime = new Date(Date.now() - 120000);
    const endTime = new Date(Date.now() - 90000);
    return {
      id: turnId,
      sessionId,
      userPrompt,
      status: 'failed',
      startedAt: startTime,
      completedAt: endTime,
      errorMessage: 'Failed to access file: Permission denied',
      createdAt: startTime,
      blockIds: [],
      blocks: [],
    };
  },
};

export const mockSession = {
  idle: (projectId: string): Session => {
    const sessionId = `session-idle-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      turnIds: [],
      turns: [],
    };
  },
  
  running: (projectId: string): Session => {
    const sessionId = `session-running-${Math.random()}`;
    const turns = [
      mockTurn.completed(sessionId, 'Add error handling to login function'),
      mockTurn.running(sessionId, 'Add input validation'),
    ];
    return {
      id: sessionId,
      projectId,
      title: 'Development Session',
      createdAt: new Date(Date.now() - 180000),
      updatedAt: new Date(),
      turnIds: turns.map(t => t.id),
      turns,
    };
  },
  
  completed: (projectId: string): Session => {
    const sessionId = `session-completed-${Math.random()}`;
    const turns = [
      mockTurn.completed(sessionId, 'Create a new React component'),
      mockTurn.completed(sessionId, 'Add tests for the component'),
    ];
    return {
      id: sessionId,
      projectId,
      title: 'Component Development',
      createdAt: new Date(Date.now() - 300000),
      updatedAt: new Date(Date.now() - 60000),
      turnIds: turns.map(t => t.id),
      turns,
    };
  },
  
  failed: (projectId: string): Session => {
    const sessionId = `session-failed-${Math.random()}`;
    const turns = [
      mockTurn.failed(sessionId, 'Update configuration file'),
    ];
    return {
      id: sessionId,
      projectId,
      title: 'Failed Operation',
      createdAt: new Date(Date.now() - 240000),
      updatedAt: new Date(Date.now() - 120000),
      turnIds: turns.map(t => t.id),
      turns,
    };
  },
  
  interrupted: (projectId: string): Session => {
    const sessionId = `session-interrupted-${Math.random()}`;
    const turns = [
      mockTurn.completed(sessionId, 'Start refactoring'),
      { ...mockTurn.running(sessionId, 'Continue refactoring'), status: 'failed' as const, errorMessage: 'Interrupted by user' },
    ];
    return {
      id: sessionId,
      projectId,
      title: 'Interrupted Session',
      createdAt: new Date(Date.now() - 150000),
      updatedAt: new Date(Date.now() - 30000),
      turnIds: turns.map(t => t.id),
      turns,
    };
  },
};

export const createMockSessionSequence = (projectId: string) => {
  const sessionId = `session-sequence-${Math.random()}`;
  const turnId = `turn-sequence-${Math.random()}`;
  
  const states = {
    initial: (): Session => ({
      id: sessionId,
      projectId,
      title: 'Test Session',
      createdAt: new Date(),
      updatedAt: new Date(),
      turnIds: [],
      turns: [],
    }),
    
    processing: (): Session => {
      const turn: Turn = {
        id: turnId,
        sessionId,
        userPrompt: 'Test input',
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        blockIds: [],
        blocks: [mockBlock.thinking(turnId)],
      };
      return {
        id: sessionId,
        projectId,
        title: 'Test Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        turnIds: [turnId],
        turns: [turn],
      };
    },
    
    withMoreBlocks: (): Session => {
      const turn: Turn = {
        id: turnId,
        sessionId,
        userPrompt: 'Test input',
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        blockIds: [],
        blocks: [
          mockBlock.thinking(turnId),
          mockBlock.toolUse(turnId, 'bash'),
          mockBlock.toolUse(turnId, 'write'),
        ],
      };
      return {
        id: sessionId,
        projectId,
        title: 'Test Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        turnIds: [turnId],
        turns: [turn],
      };
    },
    
    complete: (): Session => {
      const turn: Turn = {
        id: turnId,
        sessionId,
        userPrompt: 'Test input',
        status: 'completed',
        startedAt: new Date(Date.now() - 5000),
        completedAt: new Date(),
        errorMessage: null,
        createdAt: new Date(Date.now() - 5000),
        blockIds: [],
        blocks: [
          mockBlock.thinking(turnId),
          mockBlock.toolUse(turnId, 'bash'),
          mockBlock.toolUse(turnId, 'write'),
          mockBlock.content(turnId, 'Task completed successfully'),
        ],
      };
      return {
        id: sessionId,
        projectId,
        title: 'Test Session',
        createdAt: new Date(Date.now() - 5000),
        updatedAt: new Date(),
        turnIds: [turnId],
        turns: [turn],
      };
    },
  };
  
  return states;
};