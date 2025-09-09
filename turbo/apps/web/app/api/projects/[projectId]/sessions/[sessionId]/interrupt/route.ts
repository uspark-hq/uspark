import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { type SessionErrorResponse } from "@uspark/core";

/**
 * POST /api/projects/:projectId/sessions/:sessionId/interrupt
 * Interrupt a running session
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: SessionErrorResponse = { error: "unauthorized" };
    return NextResponse.json(error, { status: 401 });
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
    const error: SessionErrorResponse = {
      error: "project_not_found",
      error_description: "Project not found",
    };
    return NextResponse.json(error, { status: 404 });
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
    const error: SessionErrorResponse = {
      error: "session_not_found",
      error_description: "Session not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Update all running turns to failed status
  await globalThis.services.db
    .update(TURNS_TBL)
    .set({
      status: "failed",
      errorMessage: "Session interrupted by user",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(TURNS_TBL.sessionId, sessionId),
        eq(TURNS_TBL.status, "running"),
      ),
    );

  // Update session status
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      status: "interrupted",
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId));

  // Return the updated session info
  return NextResponse.json({
    id: sessionId,
    status: "interrupted",
  });
}