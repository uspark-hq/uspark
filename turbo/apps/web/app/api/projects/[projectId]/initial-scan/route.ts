import { NextResponse } from "next/server";
import { getUserId } from "../../../../../src/lib/auth/get-user-id";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { TURNS_TBL, BLOCKS_TBL } from "../../../../../src/db/schema/sessions";
import { eq, desc, asc } from "drizzle-orm";

/**
 * GET /api/projects/[projectId]/initial-scan
 * Returns initial scan progress and turn status for a specific project
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  initServices();

  // Verify project exists and belongs to user
  const projects = await globalThis.services.db
    .select({
      id: PROJECTS_TBL.id,
      initial_scan_status: PROJECTS_TBL.initialScanStatus,
      initial_scan_session_id: PROJECTS_TBL.initialScanSessionId,
    })
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, projectId));

  if (projects.length === 0) {
    return NextResponse.json(
      {
        error: "project_not_found",
        error_description: "Project not found",
      },
      { status: 404 },
    );
  }

  const project = projects[0]!;

  // Check if project belongs to user
  const userProjects = await globalThis.services.db
    .select({ id: PROJECTS_TBL.id })
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.userId, userId));

  const userProjectIds = userProjects.map((p) => p.id);
  if (!userProjectIds.includes(projectId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let initial_scan_progress = null;
  let initial_scan_turn_status = null;

  if (project.initial_scan_session_id) {
    // Get first turn status for this session
    const turns = await globalThis.services.db
      .select({ status: TURNS_TBL.status })
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, project.initial_scan_session_id))
      .orderBy(asc(TURNS_TBL.createdAt))
      .limit(1);

    if (turns.length > 0) {
      initial_scan_turn_status = turns[0]!.status;
    }

    // Only fetch progress for active scans
    if (
      project.initial_scan_status === "pending" ||
      project.initial_scan_status === "running"
    ) {
      initial_scan_progress = await getInitialScanProgress(
        project.initial_scan_session_id,
      );
    }
  }

  return NextResponse.json({
    initial_scan_status: project.initial_scan_status,
    initial_scan_progress,
    initial_scan_turn_status,
  });
}

/**
 * Get initial scan progress from session blocks
 */
async function getInitialScanProgress(
  sessionId: string,
): Promise<{ todos?: unknown[]; lastBlock?: unknown } | null> {
  // Get all turns for this session
  const turns = await globalThis.services.db
    .select({ id: TURNS_TBL.id })
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.sessionId, sessionId));

  if (turns.length === 0) {
    return null;
  }

  // Get all blocks for the first turn (usually only one turn in initial scan)
  // Ordered by created_at descending to get most recent first
  const blocks = await globalThis.services.db
    .select()
    .from(BLOCKS_TBL)
    .where(eq(BLOCKS_TBL.turnId, turns[0]!.id))
    .orderBy(desc(BLOCKS_TBL.createdAt));

  // Find the most recent TodoWrite block
  const todoWriteBlock = blocks.find(
    (block) =>
      block.type === "tool_use" &&
      (block.content as { tool_name?: string }).tool_name === "TodoWrite",
  );

  if (todoWriteBlock) {
    const content = todoWriteBlock.content as {
      parameters?: { todos?: unknown[] };
    };
    return {
      todos: content.parameters?.todos,
    };
  }

  // If no todos, find the last content block
  const lastContentBlock = blocks.find((block) => block.type === "content");

  if (lastContentBlock) {
    return {
      lastBlock: {
        type: lastContentBlock.type,
        content: lastContentBlock.content,
      },
    };
  }

  return null;
}
