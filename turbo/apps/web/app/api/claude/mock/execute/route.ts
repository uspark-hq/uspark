import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

interface ExecuteBody {
  projectId: string;
  sessionId: string;
  message: string;
}

interface Block {
  id: string;
  type: "thinking" | "tooluse" | "text" | "code";
  content: string;
  timestamp: string;
}

interface Turn {
  id: string;
  sessionId: string;
  userMessage: string;
  status: "running" | "completed" | "failed";
  blocks: Block[];
  createdAt: string;
  completedAt?: string;
}

const mockSessions = new Map<string, { turns: Turn[] }>();

function generateId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    return;
  }

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
}

async function createMockBlocks(): Promise<Block[]> {
  const blocks: Block[] = [];

  blocks.push({
    id: generateId(),
    type: "thinking",
    content: "I'm analyzing your request and planning the approach...",
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  blocks.push({
    id: generateId(),
    type: "text",
    content: "I'll help you with that. Let me start by examining the codebase.",
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 700));

  blocks.push({
    id: generateId(),
    type: "tooluse",
    content: JSON.stringify({
      tool: "read_file",
      params: { path: "/src/components/Example.tsx" },
      result: "File content read successfully",
    }),
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  blocks.push({
    id: generateId(),
    type: "code",
    content: `function exampleCode() {
  return "This is simulated code generation";
}`,
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 600));

  blocks.push({
    id: generateId(),
    type: "tooluse",
    content: JSON.stringify({
      tool: "write_file",
      params: { path: "/src/components/NewFile.tsx", content: "..." },
      result: "File written successfully",
    }),
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  blocks.push({
    id: generateId(),
    type: "text",
    content:
      "I've completed the requested changes. The code has been updated with the new functionality.",
    timestamp: new Date().toISOString(),
  });

  return blocks;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteBody = await request.json();
    const { projectId, sessionId, message } = body;

    if (!projectId || !sessionId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const turnId = generateId();

    const newTurn: Turn = {
      id: turnId,
      sessionId,
      userMessage: message,
      status: "running",
      blocks: [],
      createdAt: new Date().toISOString(),
    };

    let session = mockSessions.get(sessionId);
    if (!session) {
      session = { turns: [] };
      mockSessions.set(sessionId, session);
    }
    session.turns.push(newTurn);

    setTimeout(async () => {
      try {
        const blocks = await createMockBlocks();
        newTurn.blocks = blocks;

        await simulateDocumentModification(projectId);

        newTurn.status = "completed";
        newTurn.completedAt = new Date().toISOString();
      } catch (error) {
        console.error("Error in mock execution:", error);
        newTurn.status = "failed";
        newTurn.completedAt = new Date().toISOString();
        newTurn.blocks.push({
          id: generateId(),
          type: "text",
          content: `Mock execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        });
      }
    }, 100);

    return NextResponse.json({
      turnId,
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
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const turnId = searchParams.get("turnId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const session = mockSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (turnId) {
    const turn = session.turns.find((t) => t.id === turnId);
    if (!turn) {
      return NextResponse.json({ error: "Turn not found" }, { status: 404 });
    }
    return NextResponse.json(turn);
  }

  return NextResponse.json({
    sessionId,
    turns: session.turns,
  });
}
