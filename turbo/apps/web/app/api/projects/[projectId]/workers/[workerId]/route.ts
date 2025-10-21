import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../src/lib/init-services";
import { WORKERS_TBL } from "../../../../../../src/db/schema/workers";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/projects/:projectId/workers/:workerId/heartbeat
 * Updates worker's last heartbeat timestamp
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; workerId: string }> },
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
  const { projectId, workerId } = await context.params;

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

  // Verify worker exists and belongs to the project
  const [worker] = await globalThis.services.db
    .select()
    .from(WORKERS_TBL)
    .where(
      and(
        eq(WORKERS_TBL.id, workerId),
        eq(WORKERS_TBL.projectId, projectId),
        eq(WORKERS_TBL.userId, userId),
      ),
    );

  if (!worker) {
    return NextResponse.json(
      {
        error: "worker_not_found",
        error_description: "Worker not found",
      },
      { status: 404 },
    );
  }

  // Update heartbeat timestamp and set status to active
  const result = await globalThis.services.db
    .update(WORKERS_TBL)
    .set({
      lastHeartbeatAt: new Date(),
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(WORKERS_TBL.id, workerId))
    .returning();

  const updatedWorker = result[0];
  if (!updatedWorker) {
    throw new Error("Failed to update worker");
  }

  const response = {
    id: updatedWorker.id,
    project_id: updatedWorker.projectId,
    user_id: updatedWorker.userId,
    name: updatedWorker.name,
    status: updatedWorker.status,
    last_heartbeat_at: updatedWorker.lastHeartbeatAt.toISOString(),
    metadata: updatedWorker.metadata,
    created_at: updatedWorker.createdAt.toISOString(),
    updated_at: updatedWorker.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
}

/**
 * DELETE /api/projects/:projectId/workers/:workerId
 * Unregisters a worker
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; workerId: string }> },
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
  const { projectId, workerId } = await context.params;

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

  // Verify worker exists and belongs to the project
  const [worker] = await globalThis.services.db
    .select()
    .from(WORKERS_TBL)
    .where(
      and(
        eq(WORKERS_TBL.id, workerId),
        eq(WORKERS_TBL.projectId, projectId),
        eq(WORKERS_TBL.userId, userId),
      ),
    );

  if (!worker) {
    return NextResponse.json(
      {
        error: "worker_not_found",
        error_description: "Worker not found",
      },
      { status: 404 },
    );
  }

  // Delete the worker
  await globalThis.services.db
    .delete(WORKERS_TBL)
    .where(eq(WORKERS_TBL.id, workerId));

  return NextResponse.json({ success: true }, { status: 200 });
}
