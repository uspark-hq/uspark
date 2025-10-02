import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { projectDetailContract } from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc, count } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/projects/:projectId/sessions
 * Creates a new session for the project
 *
 * Contract: projectDetailContract.createSession
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
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
  const { projectId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json(
      {
        error: "project_not_found",
        error_description: "Project not found",
      },
      { status: 404 },
    );
  }

  // Parse and validate request body using contract schema
  const body = await request.json();
  const parseResult = projectDetailContract.createSession.body.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: parseResult.error.issues[0]?.message || "Invalid request",
      },
      { status: 400 },
    );
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
    // Internal server error - not in contract
    throw new Error("Failed to create session");
  }

  // Note: Contract uses camelCase, but we keep snake_case for backward compatibility
  // Also include project_id for backward compatibility (not in contract)
  const response = {
    id: newSession.id,
    project_id: projectId,
    title: newSession.title,
    created_at: newSession.createdAt.toISOString(),
    updated_at: newSession.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * GET /api/projects/:projectId/sessions
 * Lists all sessions for the project with pagination support
 *
 * Contract: projectDetailContract.listSessions
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
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
  const { projectId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json(
      {
        error: "project_not_found",
        error_description: "Project not found",
      },
      { status: 404 },
    );
  }

  // Parse pagination parameters
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const offset = searchParams.get("offset")
    ? parseInt(searchParams.get("offset")!, 10)
    : undefined;

  // Get total count
  const countResult = await globalThis.services.db
    .select({ value: count() })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId));
  const totalCount = countResult[0]?.value ?? 0;

  // Get sessions with pagination
  const baseQuery = globalThis.services.db
    .select({
      id: SESSIONS_TBL.id,
      title: SESSIONS_TBL.title,
      createdAt: SESSIONS_TBL.createdAt,
      updatedAt: SESSIONS_TBL.updatedAt,
    })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId))
    .orderBy(desc(SESSIONS_TBL.createdAt));

  const sessions = await (limit !== undefined && offset !== undefined
    ? baseQuery.limit(limit).offset(offset)
    : limit !== undefined
      ? baseQuery.limit(limit)
      : offset !== undefined
        ? baseQuery.offset(offset)
        : baseQuery);

  // Note: Contract uses camelCase, but we keep snake_case for backward compatibility
  const response = {
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    })),
    total: Number(totalCount),
  };

  return NextResponse.json(response);
}
