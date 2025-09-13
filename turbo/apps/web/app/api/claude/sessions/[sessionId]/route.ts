import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/claude/sessions/:sessionId
 * Get session details including all turns and blocks
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Authentication required" },
      { status: 401 },
    );
  }

  initServices();
  const db = globalThis.services.db;
  const { sessionId } = await context.params;

  try {
    // Get session with project info
    const sessionResult = await db
      .select({
        id: SESSIONS_TBL.id,
        projectId: SESSIONS_TBL.projectId,
        title: SESSIONS_TBL.title,
        createdAt: SESSIONS_TBL.createdAt,
        updatedAt: SESSIONS_TBL.updatedAt,
        projectUserId: PROJECTS_TBL.userId,
      })
      .from(SESSIONS_TBL)
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(SESSIONS_TBL.id, sessionId))
      .limit(1);

    if (sessionResult.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Session not found" },
        { status: 404 },
      );
    }

    const session = sessionResult[0]!;

    // Verify user owns the project
    if (session.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 },
      );
    }

    // Get all turns for this session
    const turns = await db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, sessionId))
      .orderBy(desc(TURNS_TBL.createdAt));

    // Get all blocks for all turns
    const turnsWithBlocks = await Promise.all(
      turns.map(async (turn) => {
        const blocks = await db
          .select()
          .from(BLOCKS_TBL)
          .where(eq(BLOCKS_TBL.turnId, turn.id))
          .orderBy(BLOCKS_TBL.sequenceNumber);

        return {
          ...turn,
          blocks,
        };
      }),
    );

    return NextResponse.json({
      id: session.id,
      projectId: session.projectId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      turns: turnsWithBlocks,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to get session" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/claude/sessions/:sessionId
 * Delete a session (cascade deletes turns and blocks)
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Authentication required" },
      { status: 401 },
    );
  }

  initServices();
  const db = globalThis.services.db;
  const { sessionId } = await context.params;

  try {
    // Verify user owns the session's project
    const sessionResult = await db
      .select({
        projectUserId: PROJECTS_TBL.userId,
      })
      .from(SESSIONS_TBL)
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(SESSIONS_TBL.id, sessionId))
      .limit(1);

    if (sessionResult.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Session not found" },
        { status: 404 },
      );
    }

    if (sessionResult[0]!.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 },
      );
    }

    // Delete session (cascade deletes turns and blocks)
    await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, sessionId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      {
        error: "internal_error",
        error_description: "Failed to delete session",
      },
      { status: 500 },
    );
  }
}
