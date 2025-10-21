import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../src/lib/init-services";
import { WORKERS_TBL } from "../../../../../src/db/schema/workers";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/projects/:projectId/workers/register
 * Registers a new worker for the project
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

  // Parse request body
  const body = await request.json();
  const { name, metadata } = body;

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

  // Get all workers for the project
  const workers = await globalThis.services.db
    .select()
    .from(WORKERS_TBL)
    .where(eq(WORKERS_TBL.projectId, projectId))
    .orderBy(desc(WORKERS_TBL.lastHeartbeatAt));

  // Update status based on last heartbeat (workers are inactive if no heartbeat in 60 seconds)
  const now = new Date();
  const workersWithStatus = workers.map((worker) => {
    const timeSinceHeartbeat = now.getTime() - worker.lastHeartbeatAt.getTime();
    const isActive = timeSinceHeartbeat < 60000; // 60 seconds

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
