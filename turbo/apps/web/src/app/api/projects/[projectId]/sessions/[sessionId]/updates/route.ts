import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "@/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "@/db/schema/sessions";
import { PROJECTS_TBL } from "@/db/schema/projects";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/updates
 * Poll for session updates
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
  const lastTurnIndex = parseInt(
    url.searchParams.get("last_turn_index") || "-1",
  );
  const lastBlockIndex = parseInt(
    url.searchParams.get("last_block_index") || "-1",
  );

  // Get all turns
  const allTurns = await globalThis.services.db
    .select({
      id: TURNS_TBL.id,
      status: TURNS_TBL.status,
      createdAt: TURNS_TBL.createdAt,
    })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(asc(TURNS_TBL.createdAt));

  // Determine new turns (after the last known index)
  const newTurnIds = allTurns.slice(lastTurnIndex + 1).map((turn) => turn.id);

  // For the last known turn, check for new blocks
  const updatedTurns: Array<{
    id: string;
    status: string;
    new_block_ids: string[];
    block_count: number;
  }> = [];

  if (lastTurnIndex >= 0 && lastTurnIndex < allTurns.length) {
    const lastKnownTurn = allTurns[lastTurnIndex];

    if (lastKnownTurn) {
      const blocks = await globalThis.services.db
        .select({ id: BLOCKS_TBL.id })
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, lastKnownTurn.id))
        .orderBy(asc(BLOCKS_TBL.sequenceNumber));

      const newBlockIds = blocks
        .slice(lastBlockIndex + 1)
        .map((block) => block.id);

      if (newBlockIds.length > 0 || lastKnownTurn.status !== "pending") {
        updatedTurns.push({
          id: lastKnownTurn.id,
          status: lastKnownTurn.status,
          new_block_ids: newBlockIds,
          block_count: blocks.length,
        });
      }
    }
  }

  // Check if there are any active (running) turns
  const hasActiveTurns = allTurns.some(
    (turn) =>
      turn.status === "running" ||
      turn.status === "pending" ||
      turn.status === "in_progress",
  );

  return NextResponse.json({
    session: {
      id: sessionId,
      updated_at: session.updatedAt.toISOString(),
    },
    new_turn_ids: newTurnIds,
    updated_turns: updatedTurns,
    has_active_turns: hasActiveTurns,
  });
}
