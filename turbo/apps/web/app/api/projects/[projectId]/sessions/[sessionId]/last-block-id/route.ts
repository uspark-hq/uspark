import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/last-block-id
 * Returns the ID of the most recent block in the session
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: "project_not_found", error_description: "Project not found" },
      { status: 404 },
    );
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
    return NextResponse.json(
      { error: "session_not_found", error_description: "Session not found" },
      { status: 404 },
    );
  }

  // Get the most recent block
  const [lastBlock] = await globalThis.services.db
    .select({ id: BLOCKS_TBL.id })
    .from(BLOCKS_TBL)
    .innerJoin(TURNS_TBL, eq(BLOCKS_TBL.turnId, TURNS_TBL.id))
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(desc(BLOCKS_TBL.createdAt))
    .limit(1);

  if (!lastBlock) {
    return NextResponse.json({ last_block_id: null });
  }

  return NextResponse.json({ last_block_id: lastBlock.id });
}
