import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/turns/:turnId
 * Returns turn details with all blocks
 */
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ projectId: string; sessionId: string; turnId: string }>;
  },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId, turnId } = await context.params;

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

  // Get turn
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)));

  if (!turn) {
    return NextResponse.json({ error: "turn_not_found" }, { status: 404 });
  }

  // Get all blocks for this turn, ordered by creation time
  const blocks = await globalThis.services.db
    .select()
    .from(BLOCKS_TBL)
    .where(eq(BLOCKS_TBL.turnId, turnId))
    .orderBy(BLOCKS_TBL.createdAt);

  // With JSON column type, content is already deserialized by Drizzle
  const parsedBlocks = blocks.map((block) => ({
    id: block.id,
    type: block.type,
    content: block.content,
  }));

  return NextResponse.json({
    id: turn.id,
    session_id: turn.sessionId,
    user_prompt: turn.userPrompt,
    status: turn.status,
    started_at: turn.startedAt,
    completed_at: turn.completedAt,
    blocks: parsedBlocks,
  });
}
