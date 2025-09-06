import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/projects/:projectId/sessions/:sessionId/interrupt
 * Interrupts an active session by marking all running turns as failed
 */
export async function POST(
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

  // Mark all running turns as failed
  await globalThis.services.db
    .update(TURNS_TBL)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: "Session interrupted by user",
    })
    .where(
      and(eq(TURNS_TBL.sessionId, sessionId), eq(TURNS_TBL.status, "running")),
    );

  // Update session timestamp
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId));

  return NextResponse.json({
    id: sessionId,
    status: "interrupted",
  });
}
