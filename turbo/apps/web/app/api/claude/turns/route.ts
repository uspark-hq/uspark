import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { TURNS_TBL, SESSIONS_TBL } from "../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * POST /api/claude/turns
 * Create a new turn in a session
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
    const { sessionId, userPrompt } = body;

    if (!sessionId || !userPrompt) {
      return NextResponse.json(
        {
          error: "bad_request",
          error_description: "Session ID and user prompt are required"
        },
        { status: 400 }
      );
    }

    // Verify user owns the session's project
    const sessionResult = await db
      .select({
        sessionId: SESSIONS_TBL.id,
        projectUserId: PROJECTS_TBL.userId,
      })
      .from(SESSIONS_TBL)
      .innerJoin(PROJECTS_TBL, eq(SESSIONS_TBL.projectId, PROJECTS_TBL.id))
      .where(eq(SESSIONS_TBL.id, sessionId))
      .limit(1);

    if (sessionResult.length === 0) {
      return NextResponse.json(
        { error: "not_found", error_description: "Session not found" },
        { status: 404 }
      );
    }

    if (sessionResult[0]!.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 }
      );
    }

    // Create new turn
    const turnId = `turn_${nanoid()}`;
    const turn = await db
      .insert(TURNS_TBL)
      .values({
        id: turnId,
        sessionId,
        userPrompt,
        status: "pending",
      })
      .returning();

    // Update session's updatedAt timestamp
    await db
      .update(SESSIONS_TBL)
      .set({ updatedAt: new Date() })
      .where(eq(SESSIONS_TBL.id, sessionId));

    return NextResponse.json(turn[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create turn:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to create turn" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claude/turns
 * List turns for a session
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
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "bad_request", error_description: "Session ID is required" },
        { status: 400 }
      );
    }

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
        { status: 404 }
      );
    }

    if (sessionResult[0]!.projectUserId !== userId) {
      return NextResponse.json(
        { error: "forbidden", error_description: "Access denied" },
        { status: 403 }
      );
    }

    // Get turns for the session
    const turns = await db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, sessionId))
      .orderBy(TURNS_TBL.createdAt);

    return NextResponse.json({ turns });
  } catch (error) {
    console.error("Failed to list turns:", error);
    return NextResponse.json(
      { error: "internal_error", error_description: "Failed to list turns" },
      { status: 500 }
    );
  }
}