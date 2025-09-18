import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../../lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../../../db/schema/sessions";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/[projectId]/sessions/[sessionId]
 * Get a single session with basic info and turn IDs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; sessionId: string } }
) {
  initServices();
  const { projectId, sessionId } = params;

  // Get session
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

  // Get turn IDs for this session
  const turns = await globalThis.services.db
    .select({ id: TURNS_TBL.id })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(TURNS_TBL.createdAt);

  return NextResponse.json({
    ...session,
    turn_ids: turns.map(t => t.id),
  });
}

/**
 * DELETE /api/projects/[projectId]/sessions/[sessionId]
 * Delete a session and all its turns/blocks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; sessionId: string } }
) {
  initServices();
  const { projectId, sessionId } = params;

  // Verify session exists and belongs to project
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

  // Delete session (cascades to turns and blocks)
  await globalThis.services.db
    .delete(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.id, sessionId));

  return NextResponse.json({ success: true });
}