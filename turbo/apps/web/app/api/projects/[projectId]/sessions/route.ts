import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  CreateSessionRequestSchema,
  type CreateSessionResponse,
  ListSessionsQuerySchema,
  type ListSessionsResponse,
  type SessionErrorResponse,
} from "@uspark/core";

/**
 * POST /api/projects/:projectId/sessions
 * Creates a new session for the project
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: SessionErrorResponse = { error: "unauthorized" };
    return NextResponse.json(error, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

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

  // Parse and validate request body
  const body = await request.json();
  const parseResult = CreateSessionRequestSchema.safeParse(body);

  if (!parseResult.success) {
    const error: SessionErrorResponse = {
      error: "invalid_request",
      error_description: parseResult.error.issues[0]?.message,
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { title } = parseResult.data;

  // Create new session
  const sessionId = `sess_${randomUUID()}`;
  const result = await globalThis.services.db
    .insert(SESSIONS_TBL)
    .values({
      id: sessionId,
      projectId,
      title: title || null,
    })
    .returning();

  const newSession = result[0];
  if (!newSession) {
    const error: SessionErrorResponse = {
      error: "failed_to_create_session",
      error_description: "Failed to create session",
    };
    return NextResponse.json(error, { status: 500 });
  }

  const response: CreateSessionResponse = {
    id: newSession.id,
    project_id: newSession.projectId,
    title: newSession.title,
    created_at: newSession.createdAt.toISOString(),
    updated_at: newSession.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
}

/**
 * GET /api/projects/:projectId/sessions
 * Lists all sessions for the project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: SessionErrorResponse = { error: "unauthorized" };
    return NextResponse.json(error, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

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

  // Parse and validate query parameters
  const url = new URL(request.url);
  const queryParams = {
    limit: url.searchParams.get("limit") || "20",
    offset: url.searchParams.get("offset") || "0",
  };

  const parseResult = ListSessionsQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const error: SessionErrorResponse = {
      error: "invalid_query",
      error_description: parseResult.error.issues[0]?.message,
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { limit, offset } = parseResult.data;

  // Get sessions
  const sessions = await globalThis.services.db
    .select({
      id: SESSIONS_TBL.id,
      title: SESSIONS_TBL.title,
      created_at: SESSIONS_TBL.createdAt,
      updated_at: SESSIONS_TBL.updatedAt,
    })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId))
    .orderBy(desc(SESSIONS_TBL.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await globalThis.services.db
    .select({ count: globalThis.services.db.$count(SESSIONS_TBL) })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId));

  const total = countResult[0]?.count ?? 0;

  const response: ListSessionsResponse = {
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString(),
    })),
    total,
  };

  return NextResponse.json(response);
}
