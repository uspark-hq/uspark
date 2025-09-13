import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../src/lib/init-services";
import {
  TURNS_TBL,
  SESSIONS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";

/**
 * GET /api/claude/turns/:turnId
 * Get turn details including all blocks
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ turnId: string }> },
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
  const { turnId } = await context.params;

  try {
    // Get turn with session and project info
    const turnResult = await db
      .select({
        id: TURNS_TBL.id,
        sessionId: TURNS_TBL.sessionId,
        userPrompt: TURNS_TBL.userPrompt,
        status: TURNS_TBL.status,
        startedAt: TURNS_TBL.startedAt,
        completedAt: TURNS_TBL.completedAt,
        errorMessage: TURNS_TBL.errorMessage,
        createdAt: TURNS_TBL.createdAt,
        projectUserId: PROJECTS_TBL.userId,
      })
      .from(TURNS_TBL)
      .innerJoin(SESSIONS_TBL, eq(TURNS_TBL.sessionId, SESSIONS_TBL.id))
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(TURNS_TBL.id, turnId))
      .limit(1);

    if (turnResult.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Turn not found" },
        { status: 404 },
      );
    }

    const turn = turnResult[0]!;

    // Verify user owns the project
    if (turn.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 },
      );
    }

    // Get all blocks for this turn
    const blocks = await db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId))
      .orderBy(BLOCKS_TBL.sequenceNumber);

    return NextResponse.json({
      id: turn.id,
      sessionId: turn.sessionId,
      userPrompt: turn.userPrompt,
      status: turn.status,
      startedAt: turn.startedAt,
      completedAt: turn.completedAt,
      errorMessage: turn.errorMessage,
      createdAt: turn.createdAt,
      blocks,
    });
  } catch (error) {
    console.error("Failed to get turn:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to get turn" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/claude/turns/:turnId
 * Update turn status
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ turnId: string }> },
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
  const { turnId } = await context.params;

  try {
    const body = await request.json();
    const { status, errorMessage } = body;

    if (!status) {
      return NextResponse.json(
        { error: "bad_request", error_description: "Status is required" },
        { status: 400 },
      );
    }

    // Verify user owns the turn's project
    const turnResult = await db
      .select({
        projectUserId: PROJECTS_TBL.userId,
        sessionId: TURNS_TBL.sessionId,
      })
      .from(TURNS_TBL)
      .innerJoin(SESSIONS_TBL, eq(TURNS_TBL.sessionId, SESSIONS_TBL.id))
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(TURNS_TBL.id, turnId))
      .limit(1);

    if (turnResult.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Turn not found" },
        { status: 404 },
      );
    }

    if (turnResult[0]!.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 },
      );
    }

    // Update turn status
    const updateData: Record<string, unknown> = { status };

    if (status === "running" && !body.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    const updatedTurn = await db
      .update(TURNS_TBL)
      .set(updateData)
      .where(eq(TURNS_TBL.id, turnId))
      .returning();

    // Update session's updatedAt timestamp
    await db
      .update(SESSIONS_TBL)
      .set({ updatedAt: new Date() })
      .where(eq(SESSIONS_TBL.id, turnResult[0]!.sessionId));

    return NextResponse.json(updatedTurn[0]);
  } catch (error) {
    console.error("Failed to update turn:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to update turn" },
      { status: 500 },
    );
  }
}
