import { http, HttpResponse, delay } from "msw";
import type {
  Session,
  Turn,
  Block,
  TurnWithBlocks,
  BlockWithParsedContent,
  SessionWithTurns,
  SessionUpdates,
} from "../components/chat/types";

// Mock data storage (simulating a database)
const mockDatabase = {
  sessions: new Map<string, Session>(),
  turns: new Map<string, Turn>(),
  blocks: new Map<string, Block>(),
  blocksByTurn: new Map<string, string[]>(), // turnId -> blockIds[]
};

// Initialize with some mock data
function initializeMockData() {
  // Create a mock session
  const sessionId = "session-mock-1";
  const projectId = "project-test-1";
  
  mockDatabase.sessions.set(sessionId, {
    id: sessionId,
    projectId,
    title: "Mock Chat Session",
    createdAt: new Date(Date.now() - 3600000).toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  });

  // Create some turns
  const turn1Id = "turn-mock-1";
  const turn2Id = "turn-mock-2";
  
  mockDatabase.turns.set(turn1Id, {
    id: turn1Id,
    sessionId,
    userPrompt: "How do I implement authentication in Next.js?",
    status: "completed",
    createdAt: new Date(Date.now() - 3000000).toISOString() as any,
    startedAt: new Date(Date.now() - 2995000).toISOString() as any,
    completedAt: new Date(Date.now() - 2900000).toISOString() as any,
    errorMessage: null,
  });

  mockDatabase.turns.set(turn2Id, {
    id: turn2Id,
    sessionId,
    userPrompt: "Can you show me an example with Clerk?",
    status: "running",
    createdAt: new Date(Date.now() - 60000).toISOString() as any,
    startedAt: new Date(Date.now() - 55000).toISOString() as any,
    completedAt: null,
    errorMessage: null,
  });

  // Add blocks for turn1
  const blocks1 = [
    {
      id: "block-1-1",
      turnId: turn1Id,
      type: "thinking" as const,
      content: {
        text: "The user is asking about authentication in Next.js. I should explain the different options available and provide a comprehensive answer.",
      },
      sequenceNumber: 0,
      createdAt: new Date(Date.now() - 2994000).toISOString() as any,
    },
    {
      id: "block-1-2",
      turnId: turn1Id,
      type: "content" as const,
      content: {
        text: "There are several ways to implement authentication in Next.js:\n\n1. **NextAuth.js** - The most popular solution\n2. **Clerk** - A modern, developer-friendly option\n3. **Supabase Auth** - If you're using Supabase\n4. **Custom JWT implementation** - For full control\n\nHere's a basic example with NextAuth.js...",
      },
      sequenceNumber: 1,
      createdAt: new Date(Date.now() - 2993000).toISOString() as any,
    },
  ];

  blocks1.forEach(block => mockDatabase.blocks.set(block.id, block));
  mockDatabase.blocksByTurn.set(turn1Id, blocks1.map(b => b.id));

  // Add initial blocks for turn2 (still running)
  const blocks2 = [
    {
      id: "block-2-1",
      turnId: turn2Id,
      type: "thinking" as const,
      content: {
        text: "The user wants a specific example with Clerk. I'll provide a complete implementation example.",
      },
      sequenceNumber: 0,
      createdAt: new Date(Date.now() - 54000).toISOString() as any,
    },
  ];

  blocks2.forEach(block => mockDatabase.blocks.set(block.id, block));
  mockDatabase.blocksByTurn.set(turn2Id, blocks2.map(b => b.id));
}

// Initialize on first import
initializeMockData();

// Helper to simulate streaming updates
let streamingInterval: NodeJS.Timeout | null = null;

function startStreamingUpdates(turnId: string) {
  if (streamingInterval) clearInterval(streamingInterval);
  
  let blockCount = mockDatabase.blocksByTurn.get(turnId)?.length || 0;
  
  streamingInterval = setInterval(() => {
    const turn = mockDatabase.turns.get(turnId);
    if (!turn || turn.status !== "running") {
      if (streamingInterval) clearInterval(streamingInterval);
      return;
    }

    // Add new blocks progressively
    blockCount++;
    const newBlockId = `block-${turnId}-${blockCount}`;
    
    if (blockCount === 2) {
      // Add content block
      const block: Block = {
        id: newBlockId,
        turnId,
        type: "content",
        content: {
          text: "Sure! Here's a complete example of implementing authentication with Clerk in Next.js:\n\n```typescript\n// app/layout.tsx\nimport { ClerkProvider } from '@clerk/nextjs'\n\nexport default function RootLayout({ children }) {\n  return (\n    <ClerkProvider>\n      {children}\n    </ClerkProvider>\n  )\n}\n```",
        },
        sequenceNumber: blockCount - 1,
        createdAt: new Date().toISOString() as any,
      };
      mockDatabase.blocks.set(newBlockId, block);
      const currentBlocks = mockDatabase.blocksByTurn.get(turnId) || [];
      mockDatabase.blocksByTurn.set(turnId, [...currentBlocks, newBlockId]);
    } else if (blockCount === 3) {
      // Add tool use block
      const block: Block = {
        id: newBlockId,
        turnId,
        type: "tool_use",
        content: {
          name: "create_file",
          input: {
            path: "middleware.ts",
            content: "import { authMiddleware } from '@clerk/nextjs';\n\nexport default authMiddleware();\n\nexport const config = {\n  matcher: ['/((?!.+\\\\.[\\\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],\n};",
          },
        },
        sequenceNumber: blockCount - 1,
        createdAt: new Date().toISOString() as any,
      };
      mockDatabase.blocks.set(newBlockId, block);
      const currentBlocks = mockDatabase.blocksByTurn.get(turnId) || [];
      mockDatabase.blocksByTurn.set(turnId, [...currentBlocks, newBlockId]);
    } else if (blockCount === 4) {
      // Add tool result block
      const block: Block = {
        id: newBlockId,
        turnId,
        type: "tool_result",
        content: {
          output: "File created successfully: middleware.ts",
          isError: false,
        },
        sequenceNumber: blockCount - 1,
        createdAt: new Date().toISOString() as any,
      };
      mockDatabase.blocks.set(newBlockId, block);
      const currentBlocks = mockDatabase.blocksByTurn.get(turnId) || [];
      mockDatabase.blocksByTurn.set(turnId, [...currentBlocks, newBlockId]);
    } else if (blockCount === 5) {
      // Add final content and complete the turn
      const block: Block = {
        id: newBlockId,
        turnId,
        type: "content",
        content: {
          text: "I've created the middleware configuration for you. This setup will protect all routes by default. You can customize the `matcher` to exclude specific routes if needed.",
        },
        sequenceNumber: blockCount - 1,
        createdAt: new Date().toISOString() as any,
      };
      mockDatabase.blocks.set(newBlockId, block);
      const currentBlocks = mockDatabase.blocksByTurn.get(turnId) || [];
      mockDatabase.blocksByTurn.set(turnId, [...currentBlocks, newBlockId]);
      
      // Complete the turn
      const updatedTurn = {
        ...turn,
        status: "completed" as const,
        completedAt: new Date().toISOString() as any,
      };
      mockDatabase.turns.set(turnId, updatedTurn);
      
      // Stop streaming
      if (streamingInterval) {
        clearInterval(streamingInterval);
        streamingInterval = null;
      }
    }
  }, 1500); // Add new block every 1.5 seconds
}

// Session API handlers
export const sessionHandlers = [
  // GET /api/projects/:projectId/sessions - List sessions
  http.get("*/api/projects/:projectId/sessions", async () => {
    await delay(100); // Simulate network delay
    
    const sessions = Array.from(mockDatabase.sessions.values())
      .map(session => ({
        id: session.id,
        project_id: session.projectId,
        title: session.title,
        created_at: session.createdAt.toISOString(),
        updated_at: typeof session.updatedAt === 'string' ? session.updatedAt : session.updatedAt.toISOString(),
      }));
    
    return HttpResponse.json(sessions);
  }),

  // POST /api/projects/:projectId/sessions - Create session
  http.post("*/api/projects/:projectId/sessions", async ({ params, request }) => {
    await delay(100);
    
    const { projectId } = params;
    const body = await request.json() as { title?: string };
    
    const newSession: Session = {
      id: `session-${Date.now()}`,
      projectId: projectId as string,
      title: body.title || "New Session",
      createdAt: new Date().toISOString() as any,
      updatedAt: new Date().toISOString() as any,
    };
    
    mockDatabase.sessions.set(newSession.id, newSession);
    
    return HttpResponse.json({
      id: newSession.id,
      project_id: newSession.projectId,
      title: newSession.title,
      created_at: newSession.createdAt.toISOString(),
      updated_at: newSession.updatedAt.toISOString(),
    });
  }),

  // GET /api/projects/:projectId/sessions/:sessionId - Get session with turns
  http.get("*/api/projects/:projectId/sessions/:sessionId", async ({ params }) => {
    await delay(100);
    
    const { sessionId } = params;
    const session = mockDatabase.sessions.get(sessionId as string);
    
    if (!session) {
      return HttpResponse.json({ error: "session_not_found" }, { status: 404 });
    }
    
    const turnIds = Array.from(mockDatabase.turns.values())
      .filter(turn => turn.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(turn => turn.id);
    
    return HttpResponse.json({
      id: session.id,
      project_id: session.projectId,
      title: session.title,
      created_at: typeof session.createdAt === 'string' ? session.createdAt : session.createdAt.toISOString(),
      updated_at: typeof session.updatedAt === 'string' ? session.updatedAt : session.updatedAt.toISOString(),
      turn_ids: turnIds,
    });
  }),

  // GET /api/projects/:projectId/sessions/:sessionId/turns - Get turns with blocks
  http.get("*/api/projects/:projectId/sessions/:sessionId/turns", async ({ params }) => {
    await delay(100);
    
    const { sessionId } = params;
    
    const turns = Array.from(mockDatabase.turns.values())
      .filter(turn => turn.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(turn => {
        const blockIds = mockDatabase.blocksByTurn.get(turn.id) || [];
        const blocks = blockIds
          .map(id => mockDatabase.blocks.get(id))
          .filter((b): b is Block => b !== undefined)
          .map(block => ({
            ...block,
            createdAt: block.createdAt ? (typeof block.createdAt === 'string' ? block.createdAt : block.createdAt.toISOString()) : undefined,
          }));
        
        return {
          ...turn,
          blocks,
          block_count: blocks.length,
          createdAt: typeof turn.createdAt === 'string' ? turn.createdAt : turn.createdAt.toISOString(),
          startedAt: turn.startedAt ? (typeof turn.startedAt === 'string' ? turn.startedAt : turn.startedAt.toISOString()) : null,
          completedAt: turn.completedAt ? (typeof turn.completedAt === 'string' ? turn.completedAt : turn.completedAt.toISOString()) : null,
        };
      });
    
    return HttpResponse.json(turns);
  }),

  // POST /api/projects/:projectId/sessions/:sessionId/turns - Create turn
  http.post("*/api/projects/:projectId/sessions/:sessionId/turns", async ({ params, request }) => {
    await delay(100);
    
    const { sessionId } = params;
    const body = await request.json() as { user_prompt: string };
    
    const newTurn: Turn = {
      id: `turn-${Date.now()}`,
      sessionId: sessionId as string,
      userPrompt: body.user_prompt,
      status: "running",
      createdAt: new Date().toISOString() as any,
      startedAt: new Date().toISOString() as any,
      completedAt: null,
      errorMessage: null,
    };
    
    mockDatabase.turns.set(newTurn.id, newTurn);
    
    // Start simulating streaming updates
    startStreamingUpdates(newTurn.id);
    
    return HttpResponse.json({
      id: newTurn.id,
      session_id: newTurn.sessionId,
      user_prompt: newTurn.userPrompt,
      status: newTurn.status,
      created_at: typeof newTurn.createdAt === 'string' ? newTurn.createdAt : newTurn.createdAt.toISOString(),
      started_at: newTurn.startedAt ? (typeof newTurn.startedAt === 'string' ? newTurn.startedAt : newTurn.startedAt.toISOString()) : null,
      completed_at: null,
      error_message: null,
      blocks: [],
      block_count: 0,
    });
  }),

  // GET /api/projects/:projectId/sessions/:sessionId/turns/:turnId - Get single turn
  http.get("*/api/projects/:projectId/sessions/:sessionId/turns/:turnId", async ({ params }) => {
    await delay(50);
    
    const { turnId } = params;
    const turn = mockDatabase.turns.get(turnId as string);
    
    if (!turn) {
      return HttpResponse.json({ error: "turn_not_found" }, { status: 404 });
    }
    
    const blockIds = mockDatabase.blocksByTurn.get(turn.id) || [];
    const blocks = blockIds
      .map(id => mockDatabase.blocks.get(id))
      .filter((b): b is Block => b !== undefined)
      .map(block => ({
        ...block,
        createdAt: block.createdAt?.toISOString(),
      }));
    
    return HttpResponse.json({
      ...turn,
      blocks,
      block_count: blocks.length,
      createdAt: typeof turn.createdAt === 'string' ? turn.createdAt : turn.createdAt.toISOString(),
      startedAt: turn.startedAt ? (typeof turn.startedAt === 'string' ? turn.startedAt : turn.startedAt.toISOString()) : null,
      completedAt: turn.completedAt ? (typeof turn.completedAt === 'string' ? turn.completedAt : turn.completedAt.toISOString()) : null,
    });
  }),

  // GET /api/projects/:projectId/sessions/:sessionId/updates - Poll for updates (SSE simulation)
  http.get("*/api/projects/:projectId/sessions/:sessionId/updates", async ({ params }) => {
    await delay(50);
    
    const { sessionId } = params;
    const session = mockDatabase.sessions.get(sessionId as string);
    
    if (!session) {
      return HttpResponse.json({ error: "session_not_found" }, { status: 404 });
    }
    
    // Get turns with their current state
    const turns = Array.from(mockDatabase.turns.values())
      .filter(turn => turn.sessionId === sessionId)
      .map(turn => {
        const blockIds = mockDatabase.blocksByTurn.get(turn.id) || [];
        return {
          id: turn.id,
          status: turn.status,
          new_block_ids: blockIds.slice(-2), // Return last 2 block IDs as "new"
          block_count: blockIds.length,
        };
      });
    
    const hasActiveTurns = turns.some(t => t.status === "running");
    
    const updates: SessionUpdates = {
      session: {
        id: session.id,
        updated_at: typeof session.updatedAt === 'string' ? session.updatedAt : session.updatedAt.toISOString(),
      },
      updated_turns: turns,
      has_active_turns: hasActiveTurns,
    };
    
    return HttpResponse.json(updates);
  }),

  // POST /api/projects/:projectId/sessions/:sessionId/interrupt - Interrupt running turns
  http.post("*/api/projects/:projectId/sessions/:sessionId/interrupt", async ({ params }) => {
    await delay(100);
    
    const { sessionId } = params;
    
    // Stop any streaming updates
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }
    
    // Mark all running turns as interrupted
    const interruptedTurns: string[] = [];
    Array.from(mockDatabase.turns.values())
      .filter(turn => turn.sessionId === sessionId && turn.status === "running")
      .forEach(turn => {
        const updatedTurn = {
          ...turn,
          status: "interrupted" as const,
          completedAt: new Date().toISOString() as any,
          errorMessage: "User interrupted",
        };
        mockDatabase.turns.set(turn.id, updatedTurn);
        interruptedTurns.push(turn.id);
      });
    
    return HttpResponse.json({
      interrupted_turn_ids: interruptedTurns,
    });
  }),

  // PATCH /api/projects/:projectId/sessions/:sessionId - Update session
  http.patch("*/api/projects/:projectId/sessions/:sessionId", async ({ params, request }) => {
    await delay(100);
    
    const { sessionId } = params;
    const session = mockDatabase.sessions.get(sessionId as string);
    
    if (!session) {
      return HttpResponse.json({ error: "session_not_found" }, { status: 404 });
    }
    
    const body = await request.json() as { title?: string };
    
    if (body.title !== undefined) {
      session.title = body.title;
      session.updatedAt = new Date().toISOString() as any;
      mockDatabase.sessions.set(sessionId as string, session);
    }
    
    return HttpResponse.json({
      id: session.id,
      project_id: session.projectId,
      title: session.title,
      created_at: typeof session.createdAt === 'string' ? session.createdAt : session.createdAt.toISOString(),
      updated_at: typeof session.updatedAt === 'string' ? session.updatedAt : session.updatedAt.toISOString(),
    });
  }),
];

// Export function to reset mock data (useful for tests)
export function resetMockSessionData() {
  mockDatabase.sessions.clear();
  mockDatabase.turns.clear();
  mockDatabase.blocks.clear();
  mockDatabase.blocksByTurn.clear();
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  initializeMockData();
}

// Export function to add custom mock data (useful for specific test scenarios)
export function addMockSession(session: Session) {
  mockDatabase.sessions.set(session.id, session);
}

export function addMockTurn(turn: Turn) {
  mockDatabase.turns.set(turn.id, turn);
}

export function addMockBlock(block: Block, turnId: string) {
  mockDatabase.blocks.set(block.id, block);
  const currentBlocks = mockDatabase.blocksByTurn.get(turnId) || [];
  mockDatabase.blocksByTurn.set(turnId, [...currentBlocks, block.id]);
}