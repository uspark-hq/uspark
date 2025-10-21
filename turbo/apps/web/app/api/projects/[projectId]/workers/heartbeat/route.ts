import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../../../../src/lib/auth/get-user-id";
import { initServices } from "../../../../../../src/lib/init-services";
import { WORKERS_TBL } from "../../../../../../src/db/schema/workers";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

// Input validation schema for heartbeat
const heartbeatSchema = z.object({
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
 * POST /api/projects/:projectId/workers/heartbeat
 * Send worker heartbeat (creates or updates worker)
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

  const parseResult = heartbeatSchema.safeParse(body);
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

  // Generate deterministic worker ID based on userId, projectId, and hostname
  const hostname = metadata?.hostname || name || "unknown";
  const workerKey = `${userId}:${projectId}:${hostname}`;
  const workerId = `worker_${crypto.createHash("sha256").update(workerKey).digest("hex").substring(0, 16)}`;

  // Upsert worker (insert or update)
  const now = new Date();

  // Try to update first
  const updated = await globalThis.services.db
    .update(WORKERS_TBL)
    .set({
      lastHeartbeatAt: now,
      updatedAt: now,
      status: "active",
      ...(name && { name }),
      ...(metadata && { metadata }),
    })
    .where(eq(WORKERS_TBL.id, workerId))
    .returning();

  let worker = updated[0];

  // If not found, insert new worker
  if (!worker) {
    const inserted = await globalThis.services.db
      .insert(WORKERS_TBL)
      .values({
        id: workerId,
        projectId,
        userId,
        name: name || hostname,
        status: "active",
        lastHeartbeatAt: now,
        metadata: metadata || null,
      })
      .returning();

    worker = inserted[0];
  }

  if (!worker) {
    throw new Error("Failed to create or update worker");
  }

  const response = {
    id: worker.id,
    project_id: projectId,
    user_id: userId,
    name: worker.name,
    status: worker.status,
    last_heartbeat_at: worker.lastHeartbeatAt.toISOString(),
    metadata: worker.metadata,
    created_at: worker.createdAt.toISOString(),
    updated_at: worker.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
