import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../../../src/lib/auth/get-user-id";
import { initServices } from "../../../../../src/lib/init-services";
import { WORKERS_TBL } from "../../../../../src/db/schema/workers";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";

// Worker timeout constant - workers are considered inactive after 60 seconds without heartbeat
const WORKER_TIMEOUT_MS = 60_000;

// Input validation schema for worker registration
const registerWorkerSchema = z.object({
  name: z.string().optional(),
  metadata: z
    .object({
      hostname: z.string().optional(),
      platform: z.string().optional(),
      cliVersion: z.string().optional(),
      nodeVersion: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/projects/:projectId/workers/register
 * Registers a new worker for the project
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

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

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "invalid_json",
        error_description: "Request body must be valid JSON",
      },
      { status: 400 },
    );
  }

  const parseResult = registerWorkerSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description:
          parseResult.error.issues[0]?.message || "Invalid request body",
      },
      { status: 400 },
    );
  }

  const { name, metadata } = parseResult.data;

  // Create new worker
  const workerId = `worker_${randomUUID()}`;
  const result = await globalThis.services.db
    .insert(WORKERS_TBL)
    .values({
      id: workerId,
      projectId,
      userId,
      name: name || null,
      status: "active",
      lastHeartbeatAt: new Date(),
      metadata: metadata || null,
    })
    .returning();

  const newWorker = result[0];
  if (!newWorker) {
    throw new Error("Failed to create worker");
  }

  const response = {
    id: newWorker.id,
    project_id: projectId,
    user_id: userId,
    name: newWorker.name,
    status: newWorker.status,
    last_heartbeat_at: newWorker.lastHeartbeatAt.toISOString(),
    metadata: newWorker.metadata,
    created_at: newWorker.createdAt.toISOString(),
    updated_at: newWorker.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
}

/**
 * GET /api/projects/:projectId/workers
 * Lists all workers for the project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

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

  // Get all workers for the project
  const workers = await globalThis.services.db
    .select()
    .from(WORKERS_TBL)
    .where(eq(WORKERS_TBL.projectId, projectId))
    .orderBy(desc(WORKERS_TBL.lastHeartbeatAt));

  // Update status based on last heartbeat
  const now = new Date();
  const workersWithStatus = workers.map((worker) => {
    const timeSinceHeartbeat = now.getTime() - worker.lastHeartbeatAt.getTime();
    const isActive = timeSinceHeartbeat < WORKER_TIMEOUT_MS;

    return {
      id: worker.id,
      project_id: worker.projectId,
      user_id: worker.userId,
      name: worker.name,
      status: isActive ? "active" : "inactive",
      last_heartbeat_at: worker.lastHeartbeatAt.toISOString(),
      metadata: worker.metadata,
      created_at: worker.createdAt.toISOString(),
      updated_at: worker.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ workers: workersWithStatus });
}
