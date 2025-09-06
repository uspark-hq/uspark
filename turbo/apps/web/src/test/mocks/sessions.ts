import type { Session, Turn, Block } from '../../lib/api/sessions';

export const mockBlock = {
  thinking: (turnId: string): Block => ({
    id: `block-thinking-${Math.random()}`,
    turnId,
    type: 'thinking',
    content: 'Analyzing the request and planning the approach...',
    createdAt: new Date().toISOString(),
  }),
  
  toolUse: (turnId: string, toolName: string): Block => ({
    id: `block-tool-${Math.random()}`,
    turnId,
    type: 'tool_use',
    content: `Executing ${toolName} command...`,
    metadata: { tool_name: toolName },
    createdAt: new Date().toISOString(),
  }),
  
  text: (turnId: string, content: string): Block => ({
    id: `block-text-${Math.random()}`,
    turnId,
    type: 'text',
    content,
    createdAt: new Date().toISOString(),
  }),
  
  error: (turnId: string, message: string): Block => ({
    id: `block-error-${Math.random()}`,
    turnId,
    type: 'error',
    content: message,
    createdAt: new Date().toISOString(),
  }),
};

export const mockTurn = {
  running: (sessionId: string, userInput: string): Turn => {
    const turnId = `turn-running-${Math.random()}`;
    return {
      id: turnId,
      sessionId,
      userInput,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        mockBlock.thinking(turnId),
        mockBlock.toolUse(turnId, 'grep'),
      ],
    };
  },
  
  completed: (sessionId: string, userInput: string): Turn => {
    const turnId = `turn-completed-${Math.random()}`;
    return {
      id: turnId,
      sessionId,
      userInput,
      status: 'completed',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date(Date.now() - 30000).toISOString(),
      blocks: [
        mockBlock.thinking(turnId),
        mockBlock.toolUse(turnId, 'read'),
        mockBlock.toolUse(turnId, 'edit'),
        mockBlock.text(turnId, 'Successfully updated the file with error handling.'),
      ],
    };
  },
  
  failed: (sessionId: string, userInput: string): Turn => {
    const turnId = `turn-failed-${Math.random()}`;
    return {
      id: turnId,
      sessionId,
      userInput,
      status: 'failed',
      createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date(Date.now() - 90000).toISOString(),
      blocks: [
        mockBlock.error(turnId, 'Failed to access file: Permission denied'),
      ],
    };
  },
};

export const mockSession = {
  idle: (projectId: string): Session => {
    const sessionId = `session-idle-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      status: 'idle',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  running: (projectId: string): Session => {
    const sessionId = `session-running-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      status: 'running',
      turns: [
        mockTurn.completed(sessionId, 'Add error handling to login function'),
        mockTurn.running(sessionId, 'Add input validation'),
      ],
      createdAt: new Date(Date.now() - 180000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  completed: (projectId: string): Session => {
    const sessionId = `session-completed-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      status: 'completed',
      turns: [
        mockTurn.completed(sessionId, 'Create a new React component'),
        mockTurn.completed(sessionId, 'Add tests for the component'),
      ],
      createdAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date(Date.now() - 60000).toISOString(),
    };
  },
  
  failed: (projectId: string): Session => {
    const sessionId = `session-failed-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      status: 'failed',
      turns: [
        mockTurn.failed(sessionId, 'Update configuration file'),
      ],
      createdAt: new Date(Date.now() - 240000).toISOString(),
      updatedAt: new Date(Date.now() - 120000).toISOString(),
    };
  },
  
  interrupted: (projectId: string): Session => {
    const sessionId = `session-interrupted-${Math.random()}`;
    return {
      id: sessionId,
      projectId,
      status: 'interrupted',
      turns: [
        mockTurn.completed(sessionId, 'Start refactoring'),
        mockTurn.running(sessionId, 'Continue refactoring'),
      ],
      createdAt: new Date(Date.now() - 150000).toISOString(),
      updatedAt: new Date(Date.now() - 30000).toISOString(),
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
      status: 'idle',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    
    processing: (): Session => ({
      id: sessionId,
      projectId,
      status: 'running',
      turns: [{
        id: turnId,
        sessionId,
        userInput: 'Test input',
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [mockBlock.thinking(turnId)],
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    
    withMoreBlocks: (): Session => ({
      id: sessionId,
      projectId,
      status: 'running',
      turns: [{
        id: turnId,
        sessionId,
        userInput: 'Test input',
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          mockBlock.thinking(turnId),
          mockBlock.toolUse(turnId, 'bash'),
          mockBlock.toolUse(turnId, 'write'),
        ],
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    
    complete: (): Session => ({
      id: sessionId,
      projectId,
      status: 'completed',
      turns: [{
        id: turnId,
        sessionId,
        userInput: 'Test input',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          mockBlock.thinking(turnId),
          mockBlock.toolUse(turnId, 'bash'),
          mockBlock.toolUse(turnId, 'write'),
          mockBlock.text(turnId, 'Task completed successfully'),
        ],
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };
  
  return states;
};