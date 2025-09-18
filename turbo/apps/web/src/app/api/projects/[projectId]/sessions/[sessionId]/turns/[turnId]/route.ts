import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../../../../lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../db/schema/sessions";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]
 * Get a single turn with all its blocks
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      projectId: string;
      sessionId: string;
      turnId: string;
    };
  }
) {
  initServices();
  const { projectId, sessionId, turnId } = params;

  // Verify session exists
  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(
      and(
        eq(SESSIONS_TBL.id, sessionId),
        eq(SESSIONS_TBL.projectId, projectId)
      )
    )
    .limit(1);

  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Get turn
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)))
    .limit(1);

  if (!turn) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  // Get all blocks for this turn
  const blocks = await globalThis.services.db
    .select()
    .from(BLOCKS_TBL)
    .where(eq(BLOCKS_TBL.turnId, turnId))
    .orderBy(asc(BLOCKS_TBL.sequenceNumber));

  return NextResponse.json({
    ...turn,
    blocks,
  });
}

