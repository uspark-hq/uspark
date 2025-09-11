import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
} from "../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId
 * Returns session details with turn IDs
 */
export async function GET(
  _request: NextRequest,
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

  // Get session
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

  // Get turn IDs for this session
  const turns = await globalThis.services.db
    .select({ id: TURNS_TBL.id })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(TURNS_TBL.createdAt);

  const turnIds = turns.map((turn) => turn.id);

  return NextResponse.json({
    id: session.id,
    project_id: session.projectId,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    turn_ids: turnIds,
  });
}

/**
 * PATCH /api/projects/:projectId/sessions/:sessionId
 * Updates session status or metadata
 */
export async function PATCH(
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
  const { title } = body;

  // Update session
  const result = await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      title: title !== undefined ? title : session.title,
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId))
    .returning();

  const updatedSession = result[0];
  if (!updatedSession) {
    return NextResponse.json(
      { error: "failed_to_update_session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: updatedSession.id,
    project_id: updatedSession.projectId,
    title: updatedSession.title,
    created_at: updatedSession.createdAt,
    updated_at: updatedSession.updatedAt,
  });
}
