import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
import type {
  NewSession,
  NewTurn,
  NewBlock,
  ThinkingBlockContent,
  ContentBlockContent,
  ToolUseBlockContent,
  ToolResultBlockContent,
} from "../../../../../src/db/schema/sessions";
import { eq, and, asc } from "drizzle-orm";
import * as Y from "yjs";

interface ExecuteBody {
  projectId: string;
  sessionId?: string;
  message: string;
}

async function simulateDocumentModification(projectId: string) {
  initServices();
  const db = globalThis.services.db;

  const [project] = await db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, projectId))
    .limit(1);

  if (!project || !project.ydocData) {
    console.log("Project not found or no ydoc data");
    return;
  }

  try {
    const ydoc = new Y.Doc();
    const ydocContent = Buffer.from(project.ydocData, "base64");
    Y.applyUpdate(ydoc, new Uint8Array(ydocContent));

    const ytext = ydoc.getText("content");
    const currentContent = ytext.toString();

    const mockChanges = [
      "\n\n// Mock change by Claude Code simulator",
      "\nfunction simulatedFunction() {",
      "\n  console.log('This was added by the mock executor');",
      "\n  return { status: 'simulated', timestamp: new Date().toISOString() };",
      "\n}\n",
    ];

    for (const change of mockChanges) {
      ytext.insert(currentContent.length, change);
    }

    const updatedYdoc = Y.encodeStateAsUpdate(ydoc);
    const ydocBase64 = Buffer.from(updatedYdoc).toString("base64");

    await db
      .update(PROJECTS_TBL)
      .set({
        ydocData: ydocBase64,
        version: (project.version || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(PROJECTS_TBL.id, project.id));
  } catch (error) {
    console.error("Error modifying document:", error);
  }
}

async function createMockBlocks(turnId: string): Promise<void> {
  initServices();
  const db = globalThis.services.db;

  const blocks: NewBlock[] = [];
  let sequenceNumber = 0;

  // Thinking block
  await new Promise((resolve) => setTimeout(resolve, 500));
  const thinkingContent: ThinkingBlockContent = {
    text: "I'm analyzing your request and planning the approach...",
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "thinking",
    content: JSON.stringify(thinkingContent),
    sequenceNumber: sequenceNumber++,
  });

  // Content block
  await new Promise((resolve) => setTimeout(resolve, 700));
  const contentBlock: ContentBlockContent = {
    text: "I'll help you with that. Let me start by examining the codebase.",
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "content",
    content: JSON.stringify(contentBlock),
    sequenceNumber: sequenceNumber++,
  });

  // Tool use block
  await new Promise((resolve) => setTimeout(resolve, 800));
  const toolUseContent: ToolUseBlockContent = {
    tool_name: "read_file",
    parameters: { path: "/src/components/Example.tsx" },
    tool_use_id: `tool_use_${Date.now()}_1`,
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "tool_use",
    content: JSON.stringify(toolUseContent),
    sequenceNumber: sequenceNumber++,
  });

  // Tool result block
  await new Promise((resolve) => setTimeout(resolve, 600));
  const toolResultContent: ToolResultBlockContent = {
    tool_use_id: toolUseContent.tool_use_id,
    result: "File content read successfully",
    error: null,
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "tool_result",
    content: JSON.stringify(toolResultContent),
    sequenceNumber: sequenceNumber++,
  });

  // Another content block with code
  await new Promise((resolve) => setTimeout(resolve, 500));
  const codeContent: ContentBlockContent = {
    text: `Here's the code I've generated:

\`\`\`typescript
function exampleCode() {
  return "This is simulated code generation";
}
\`\`\``,
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "content",
    content: JSON.stringify(codeContent),
    sequenceNumber: sequenceNumber++,
  });

  // Final content block
  await new Promise((resolve) => setTimeout(resolve, 500));
  const finalContent: ContentBlockContent = {
    text: "I've completed the requested changes. The code has been updated with the new functionality.",
  };
  blocks.push({
    id: `block_${crypto.randomUUID()}`,
    turnId,
    type: "content",
    content: JSON.stringify(finalContent),
    sequenceNumber: sequenceNumber++,
  });

  // Insert all blocks into database
  await db.insert(BLOCKS_TBL).values(blocks);
}

export async function POST(request: NextRequest) {
  try {
    initServices();
    const db = globalThis.services.db;

    const body: ExecuteBody = await request.json();
    const { projectId, message } = body;
    let { sessionId } = body;

    if (!projectId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create or get session
    if (!sessionId) {
      const newSession: NewSession = {
        id: `sess_${crypto.randomUUID()}`,
        projectId,
        title: `Mock session ${new Date().toISOString()}`,
      };
      const [session] = await db
        .insert(SESSIONS_TBL)
        .values(newSession)
        .returning();
      sessionId = session.id;
    } else {
      // Verify session exists
      const [existingSession] = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId))
        .limit(1);

      if (!existingSession) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }
    }

    // Create new turn
    const newTurn: NewTurn = {
      id: `turn_${crypto.randomUUID()}`,
      sessionId,
      userPrompt: message,
      status: "running",
      startedAt: new Date(),
    };

    const [turn] = await db.insert(TURNS_TBL).values(newTurn).returning();

    // Start async block generation
    setTimeout(async () => {
      try {
        await createMockBlocks(turn.id);
        await simulateDocumentModification(projectId);

        // Update turn status to completed
        await db
          .update(TURNS_TBL)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(TURNS_TBL.id, turn.id));

        // Update session's updatedAt
        await db
          .update(SESSIONS_TBL)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(SESSIONS_TBL.id, sessionId!));
      } catch (error) {
        console.error("Error in mock execution:", error);

        // Update turn status to failed
        await db
          .update(TURNS_TBL)
          .set({
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          })
          .where(eq(TURNS_TBL.id, turn.id));
      }
    }, 100);

    return NextResponse.json({
      turnId: turn.id,
      sessionId,
      status: "running",
      message: "Mock execution started",
    });
  } catch (error) {
    console.error("Error starting mock execution:", error);
    return NextResponse.json(
      { error: "Failed to start mock execution" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    initServices();
    const db = globalThis.services.db;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const turnId = searchParams.get("turnId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // Get session
    const [session] = await db
      .select()
      .from(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (turnId) {
      // Get specific turn with blocks
      const [turn] = await db
        .select()
        .from(TURNS_TBL)
        .where(
          and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)),
        )
        .limit(1);

      if (!turn) {
        return NextResponse.json({ error: "Turn not found" }, { status: 404 });
      }

      // Get blocks for this turn
      const blocks = await db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId))
        .orderBy(asc(BLOCKS_TBL.sequenceNumber));

      return NextResponse.json({
        ...turn,
        blocks,
      });
    }

    // Get all turns for the session
    const turns = await db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, sessionId))
      .orderBy(asc(TURNS_TBL.createdAt));

    return NextResponse.json({
      sessionId,
      session,
      turns,
    });
  } catch (error) {
    console.error("Error fetching session data:", error);
    return NextResponse.json(
      { error: "Failed to fetch session data" },
      { status: 500 },
    );
  }
}
