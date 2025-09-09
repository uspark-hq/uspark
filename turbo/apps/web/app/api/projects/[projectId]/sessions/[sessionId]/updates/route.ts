import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
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

  // Get query parameters
  const url = new URL(request.url);
  const lastTurnIndex = url.searchParams.get("last_turn_index");
  const sinceTimestamp = url.searchParams.get("since");

  // Get all turns for the session ordered by creation time
  const allTurns = await globalThis.services.db
    .select({
      id: TURNS_TBL.id,
      status: TURNS_TBL.status,
      createdAt: TURNS_TBL.createdAt,
      updatedAt: TURNS_TBL.updatedAt,
    })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(asc(TURNS_TBL.createdAt));

  // Determine which turns are new based on last_turn_index
  let newTurnIds: string[] = [];
  let updatedTurns: Array<{ id: string; status: string }> = [];
  
  if (lastTurnIndex !== null) {
    const index = parseInt(lastTurnIndex || "-1");
    newTurnIds = allTurns.slice(index + 1).map(t => t.id);
  } else {
    // If no last_turn_index, all turns are new
    newTurnIds = allTurns.map(t => t.id);
  }

  // Check if there are any active turns (pending, running, or in_progress)
  const hasActiveTurns = allTurns.some(
    t => t.status === "pending" || t.status === "running" || t.status === "in_progress"
  );

  // If since timestamp is provided, find turns updated after that time
  if (sinceTimestamp) {
    const since = new Date(sinceTimestamp);
    updatedTurns = allTurns
      .filter(t => t.updatedAt > since)
      .map(t => ({ id: t.id, status: t.status }));
  }

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