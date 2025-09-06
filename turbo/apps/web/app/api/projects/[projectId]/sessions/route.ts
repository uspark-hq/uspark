import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Parse request body
  const body = await request.json();
  const { title } = body;

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
    return NextResponse.json(
      { error: "failed_to_create_session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: newSession.id,
    project_id: newSession.projectId,
    title: newSession.title,
    created_at: newSession.createdAt,
    updated_at: newSession.updatedAt,
  });
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Parse query parameters
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

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

  return NextResponse.json({
    sessions,
    total,
  });
}
