import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * POST /api/claude/sessions
 * Create a new Claude session for a project
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Authentication required" },
      { status: 401 }
    );
  }

  initServices();
  const db = globalThis.services.db;

  try {
    const body = await request.json();
    const { projectId, title } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "bad_request", error_description: "Project ID is required" },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await db
      .select()
      .from(PROJECTS_TBL)
      .where(and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Project not found" },
        { status: 404 }
      );
    }

    // Create new session
    const sessionId = `sess_${nanoid()}`;
    const session = await db
      .insert(SESSIONS_TBL)
      .values({
        id: sessionId,
        projectId,
        title: title || "New Session",
      })
      .returning();

    return NextResponse.json(session[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to create session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claude/sessions
 * List all sessions for the user's projects
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Authentication required" },
      { status: 401 }
    );
  }

  initServices();
  const db = globalThis.services.db;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query based on whether projectId is provided
    let query = db
      .select({
        id: SESSIONS_TBL.id,
        projectId: SESSIONS_TBL.projectId,
        title: SESSIONS_TBL.title,
        createdAt: SESSIONS_TBL.createdAt,
        updatedAt: SESSIONS_TBL.updatedAt,
      })
      .from(SESSIONS_TBL)
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(PROJECTS_TBL.userId, userId))
      .orderBy(desc(SESSIONS_TBL.updatedAt))
      .limit(limit)
      .offset(offset);

    if (projectId) {
      query = db
        .select({
          id: SESSIONS_TBL.id,
          projectId: SESSIONS_TBL.projectId,
          title: SESSIONS_TBL.title,
          createdAt: SESSIONS_TBL.createdAt,
          updatedAt: SESSIONS_TBL.updatedAt,
          })
        .from(SESSIONS_TBL)
        .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
        .where(
          and(
            eq(PROJECTS_TBL.userId, userId),
            eq(SESSIONS_TBL.projectId, projectId)
          )
        )
        .orderBy(desc(SESSIONS_TBL.updatedAt))
        .limit(limit)
        .offset(offset);
    }

    const sessions = await query;

    return NextResponse.json({
      sessions,
      limit,
      offset,
      total: sessions.length,
    });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to list sessions" },
      { status: 500 }
    );
  }
}