import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../../db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../db/schema/projects";
import { eq, desc, sql, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * GET /api/projects/[projectId]/sessions
 * Query sessions for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = params;

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Verify project exists and user owns it
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Get sessions with turn count
  const sessions = await globalThis.services.db
    .select({
      id: SESSIONS_TBL.id,
      projectId: SESSIONS_TBL.projectId,
      title: SESSIONS_TBL.title,
      createdAt: SESSIONS_TBL.createdAt,
      updatedAt: SESSIONS_TBL.updatedAt,
      turnCount: sql<number>`COUNT(${TURNS_TBL.id})`.as("turnCount"),
    })
    .from(SESSIONS_TBL)
    .leftJoin(TURNS_TBL, eq(SESSIONS_TBL.id, TURNS_TBL.sessionId))
    .where(eq(SESSIONS_TBL.projectId, projectId))
    .groupBy(SESSIONS_TBL.id)
    .orderBy(desc(SESSIONS_TBL.updatedAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await globalThis.services.db
    .select({ count: sql<number>`COUNT(*)` })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId));

  return NextResponse.json({
    sessions,
    total: countResult?.count || 0,
    limit,
    offset,
  });
}

/**
 * POST /api/projects/[projectId]/sessions
 * Create a new session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = params;

  // Parse request body
  const body = await request.json();
  const { title } = body;

  // Verify project exists and user owns it
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Create session
  const sessionId = `sess_${nanoid()}`;
  const now = new Date();

  const [newSession] = await globalThis.services.db
    .insert(SESSIONS_TBL)
    .values({
      id: sessionId,
      projectId,
      title: title || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(newSession, { status: 201 });
}
