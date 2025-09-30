import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { z } from "zod";
import { projectDetailContract } from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// Extract types from contracts
type UnauthorizedResponse = z.infer<
  (typeof projectDetailContract.listSessions.responses)[401]
>;
type NotFoundResponse = z.infer<
  (typeof projectDetailContract.listSessions.responses)[404]
>;
type BadRequestResponse = z.infer<
  (typeof projectDetailContract.createSession.responses)[400]
>;

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
    const error: UnauthorizedResponse = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
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
    const error: NotFoundResponse = {
      error: "project_not_found",
      error_description: "Project not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Parse and validate request body using contract schema
  const body = await request.json();
  const parseResult = projectDetailContract.createSession.body.safeParse(body);

  if (!parseResult.success) {
    const error: BadRequestResponse = {
      error: parseResult.error.issues[0]?.message || "Invalid request",
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
    // Internal server error - not in contract
    throw new Error("Failed to create session");
  }

  // Note: Contract uses camelCase, but we keep snake_case for backward compatibility
  const response = {
    id: newSession.id,
    title: newSession.title,
    created_at: newSession.createdAt.toISOString(),
    updated_at: newSession.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
}

/**
 * GET /api/projects/:projectId/sessions
 * Lists all sessions for the project
 *
 * Contract: projectDetailContract.listSessions
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: UnauthorizedResponse = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
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
    const error: NotFoundResponse = {
      error: "project_not_found",
      error_description: "Project not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Get sessions (contract doesn't support pagination in current version)
  const sessions = await globalThis.services.db
    .select({
      id: SESSIONS_TBL.id,
      title: SESSIONS_TBL.title,
      createdAt: SESSIONS_TBL.createdAt,
      updatedAt: SESSIONS_TBL.updatedAt,
    })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.projectId, projectId))
    .orderBy(desc(SESSIONS_TBL.createdAt));

  // Note: Contract uses camelCase, but we keep snake_case for backward compatibility
  const response = {
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    })),
  };

  return NextResponse.json(response);
}
