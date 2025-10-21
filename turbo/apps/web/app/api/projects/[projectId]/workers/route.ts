import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../../../src/lib/auth/get-user-id";
import { initServices } from "../../../../../src/lib/init-services";
import { WORKERS_TBL } from "../../../../../src/db/schema/workers";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and, desc } from "drizzle-orm";

// Worker timeout constant - workers are considered inactive after 60 seconds without heartbeat
const WORKER_TIMEOUT_MS = 60_000;

/**
 * GET /api/projects/:projectId/workers
 * Lists all workers for the project with activity status
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
