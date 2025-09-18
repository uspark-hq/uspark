import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL
} from "../../../../../../../db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../db/schema/projects";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * GET /api/projects/[projectId]/sessions/[sessionId]/turns
 * Get turns for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; sessionId: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  initServices();
  const { projectId, sessionId } = params;

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Verify user owns the project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(
        eq(PROJECTS_TBL.id, projectId),
        eq(PROJECTS_TBL.userId, userId)
      )
    )
    .limit(1);

  if (!project) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 }
    );
  }

  // Verify session exists
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
      { error: "session_not_found" },
      { status: 404 }
    );
  }

  // Get turns
  const turns = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId))
    .orderBy(TURNS_TBL.createdAt)
    .limit(limit)
    .offset(offset);

  // Get block IDs for each turn
  const turnsWithBlocks = await Promise.all(
    turns.map(async (turn) => {
      const blocks = await globalThis.services.db
        .select({ id: BLOCKS_TBL.id })
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turn.id))
        .orderBy(BLOCKS_TBL.sequenceNumber);

      return {
        ...turn,
        block_ids: blocks.map(b => b.id),
        block_count: blocks.length,
      };
    })
  );

  // Get total count
  const [totalTurns] = await globalThis.services.db
    .select({ count: sql<number>`COUNT(*)` })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId));

  return NextResponse.json({
    turns: turnsWithBlocks,
    total: totalTurns?.count || 0,
    limit,
    offset,
  });
}

/**
 * POST /api/projects/[projectId]/sessions/[sessionId]/turns
 * Create a new turn (this would trigger Claude execution in production)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; sessionId: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  initServices();
  const { projectId, sessionId } = params;

  // Parse request body
  const body = await request.json();
  const { user_message } = body;

  if (!user_message) {
    return NextResponse.json(
      { error: "user_message is required" },
      { status: 400 }
    );
  }

  // Verify user owns the project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(
        eq(PROJECTS_TBL.id, projectId),
        eq(PROJECTS_TBL.userId, userId)
      )
    )
    .limit(1);

  if (!project) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 }
    );
  }

  // Verify session exists
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
      { error: "session_not_found" },
      { status: 404 }
    );
  }

  // Create turn
  const turnId = `turn_${nanoid()}`;
  const now = new Date();

  const [newTurn] = await globalThis.services.db
    .insert(TURNS_TBL)
    .values({
      id: turnId,
      sessionId,
      userPrompt: user_message,
      status: "pending",
      createdAt: now,
    })
    .returning();

  // Update session's updatedAt
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({ updatedAt: now })
    .where(eq(SESSIONS_TBL.id, sessionId));

  // TODO: In production, this would trigger Claude execution via E2B
  // For now, just return the created turn

  return NextResponse.json(newTurn, { status: 201 });
}