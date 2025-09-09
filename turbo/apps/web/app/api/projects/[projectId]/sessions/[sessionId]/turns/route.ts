import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  CreateTurnRequestSchema,
  type CreateTurnResponse,
  ListTurnsQuerySchema,
  type ListTurnsResponse,
  type TurnErrorResponse,
} from "@uspark/core";

/**
 * POST /api/projects/:projectId/sessions/:sessionId/turns
 * Creates a new turn (conversation round) in the session
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: TurnErrorResponse = { error: "unauthorized" };
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
    const error: TurnErrorResponse = {
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
    const error: TurnErrorResponse = {
      error: "session_not_found",
      error_description: "Session not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Parse and validate request body
  const body = await request.json();
  const parseResult = CreateTurnRequestSchema.safeParse(body);

  if (!parseResult.success) {
    // Check if the specific error is about missing user_message
    const firstIssue = parseResult.error.issues[0];
    const errorCode =
      firstIssue?.path[0] === "user_message"
        ? "user_message_required"
        : "invalid_request";

    const error: TurnErrorResponse = {
      error: errorCode,
      error_description: firstIssue?.message || "Invalid request",
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { user_message } = parseResult.data;

  // Create new turn
  const turnId = `turn_${randomUUID()}`;
  const result = await globalThis.services.db
    .insert(TURNS_TBL)
    .values({
      id: turnId,
      sessionId,
      userPrompt: user_message,
      status: "pending",
    })
    .returning();

  const newTurn = result[0];
  if (!newTurn) {
    const error: TurnErrorResponse = {
      error: "failed_to_create_turn",
      error_description: "Failed to create turn",
    };
    return NextResponse.json(error, { status: 500 });
  }

  const response: CreateTurnResponse = {
    id: newTurn.id,
    session_id: newTurn.sessionId,
    user_message: newTurn.userPrompt,
    status: newTurn.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "failed"
      | "interrupted",
    created_at: newTurn.createdAt.toISOString(),
  };

  return NextResponse.json(response);
}

/**
 * GET /api/projects/:projectId/sessions/:sessionId/turns
 * Lists all turns in the session
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: TurnErrorResponse = { error: "unauthorized" };
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
    const error: TurnErrorResponse = {
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
    const error: TurnErrorResponse = {
      error: "session_not_found",
      error_description: "Session not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Parse and validate query parameters
  const url = new URL(request.url);
  const queryParams = {
    limit: url.searchParams.get("limit") || "20",
    offset: url.searchParams.get("offset") || "0",
  };

  const parseResult = ListTurnsQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const error: TurnErrorResponse = {
      error: "invalid_query",
      error_description: parseResult.error.issues[0]?.message,
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { limit, offset } = parseResult.data;

  // Get turns with block counts
  const turns = await globalThis.services.db
    .select({
      id: TURNS_TBL.id,
      user_prompt: TURNS_TBL.userPrompt,
      status: TURNS_TBL.status,
      started_at: TURNS_TBL.startedAt,
      completed_at: TURNS_TBL.completedAt,
      created_at: TURNS_TBL.createdAt,
    })
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
        block_count: blocks.length,
        block_ids: blocks.map((b) => b.id),
      };
    }),
  );

  // Get total count
  const countResult = await globalThis.services.db
    .select({ count: globalThis.services.db.$count(TURNS_TBL) })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId));

  const total = countResult[0]?.count ?? 0;

  const response: ListTurnsResponse = {
    turns: turnsWithBlocks.map((t) => ({
      id: t.id,
      user_prompt: t.user_prompt,
      status: t.status as
        | "pending"
        | "in_progress"
        | "completed"
        | "failed"
        | "interrupted",
      started_at: t.started_at ? t.started_at.toISOString() : null,
      completed_at: t.completed_at ? t.completed_at.toISOString() : null,
      created_at: t.created_at.toISOString(),
      block_count: t.block_count,
      block_ids: t.block_ids,
    })),
    total,
  };

  return NextResponse.json(response);
}
