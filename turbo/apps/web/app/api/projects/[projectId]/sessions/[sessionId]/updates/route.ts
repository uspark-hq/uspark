import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { type SessionUpdatesResponse, type SessionErrorResponse } from "@uspark/core";

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

  // Get the 'since' parameter from query
  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  // TODO: Implement actual polling logic based on 'since' timestamp
  // For now, return no updates
  const response: SessionUpdatesResponse = {
    hasUpdates: false,
    updatedAt: session.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
}