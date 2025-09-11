import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/turns/:turnId
 * Returns turn details with all blocks
 */
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ projectId: string; sessionId: string; turnId: string }>;
  },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId, turnId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Verify session exists
  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(
      and(
        eq(SESSIONS_TBL.id, sessionId),
        eq(SESSIONS_TBL.projectId, projectId),
      ),
    );

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Get turn
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)));

  if (!turn) {
    return NextResponse.json({ error: "turn_not_found" }, { status: 404 });
  }

  // Get all blocks for this turn
  const blocks = await globalThis.services.db
    .select()
    .from(BLOCKS_TBL)
    .where(eq(BLOCKS_TBL.turnId, turnId))
    .orderBy(BLOCKS_TBL.sequenceNumber);

  // Parse block content from JSON strings
  const parsedBlocks = blocks.map((block) => ({
    id: block.id,
    type: block.type,
    content: JSON.parse(block.content),
    sequence_number: block.sequenceNumber,
  }));

  return NextResponse.json({
    id: turn.id,
    session_id: turn.sessionId,
    user_prompt: turn.userPrompt,
    status: turn.status,
    started_at: turn.startedAt,
    completed_at: turn.completedAt,
    blocks: parsedBlocks,
  });
}

/**
 * PATCH /api/projects/:projectId/sessions/:sessionId/turns/:turnId
 * Updates turn status
 */
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ projectId: string; sessionId: string; turnId: string }>;
  },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId, turnId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Verify session exists
  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(
      and(
        eq(SESSIONS_TBL.id, sessionId),
        eq(SESSIONS_TBL.projectId, projectId),
      ),
    );

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Verify turn exists
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)));

  if (!turn) {
    return NextResponse.json({ error: "turn_not_found" }, { status: 404 });
  }

  // Parse request body
  const body = await request.json();
  const { status, error_message } = body;

  // Prepare update data
  const updateData: Partial<typeof turn> = {};

  if (status) {
    updateData.status = status;

    if (status === "running" && !turn.startedAt) {
      updateData.startedAt = new Date();
    }

    if ((status === "completed" || status === "failed") && !turn.completedAt) {
      updateData.completedAt = new Date();
    }
  }

  if (error_message !== undefined) {
    updateData.errorMessage = error_message;
  }

  // Update turn
  const result = await globalThis.services.db
    .update(TURNS_TBL)
    .set(updateData)
    .where(eq(TURNS_TBL.id, turnId))
    .returning();

  const updatedTurn = result[0];
  if (!updatedTurn) {
    return NextResponse.json(
      { error: "failed_to_update_turn" },
      { status: 500 },
    );
  }

  // Update session timestamp
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId));

  return NextResponse.json({
    id: updatedTurn.id,
    session_id: updatedTurn.sessionId,
    status: updatedTurn.status,
    started_at: updatedTurn.startedAt,
    completed_at: updatedTurn.completedAt,
    error_message: updatedTurn.errorMessage,
  });
}
