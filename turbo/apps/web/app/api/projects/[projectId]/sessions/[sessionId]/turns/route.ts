import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/projects/:projectId/sessions/:sessionId/turns
 * Creates a new turn (conversation round) in the session
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId } = await context.params;

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

  // Parse request body
  const body = await request.json();
  const { user_message } = body;

  if (!user_message) {
    return NextResponse.json(
      { error: "user_message_required" },
      { status: 400 },
    );
  }

  // Create new turn
  const turnId = `turn_${randomUUID()}`;
  const result = await globalThis.services.db
    .insert(TURNS_TBL)
    .values({
      id: turnId,
      sessionId,
      userPrompt: user_message,
      status: "pending",
    })
    .returning();

  const newTurn = result[0];
  if (!newTurn) {
    return NextResponse.json(
      { error: "failed_to_create_turn" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: newTurn.id,
    session_id: newTurn.sessionId,
    user_message: newTurn.userPrompt,
    status: newTurn.status,
    created_at: newTurn.createdAt,
  });
}

/**
 * GET /api/projects/:projectId/sessions/:sessionId/turns
 * Lists all turns in the session
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId } = await context.params;

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

  // Parse query parameters
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Get turns with block counts
  const turns = await globalThis.services.db
    .select({
      id: TURNS_TBL.id,
      user_prompt: TURNS_TBL.userPrompt,
      status: TURNS_TBL.status,
      started_at: TURNS_TBL.startedAt,
      completed_at: TURNS_TBL.completedAt,
      created_at: TURNS_TBL.createdAt,
    })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(TURNS_TBL.createdAt)
    .limit(limit)
    .offset(offset);

  // Get block IDs for each turn
  const turnsWithBlocks = await Promise.all(
    turns.map(async (turn) => {
      const blocks = await globalThis.services.db
        .select({ id: BLOCKS_TBL.id })
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turn.id))
        .orderBy(BLOCKS_TBL.sequenceNumber);

      return {
        ...turn,
        block_count: blocks.length,
        block_ids: blocks.map((b) => b.id),
      };
    }),
  );

  // Get total count
  const countResult = await globalThis.services.db
    .select({ count: globalThis.services.db.$count(TURNS_TBL) })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId));

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    turns: turnsWithBlocks,
    total,
  });
}
