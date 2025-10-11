import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { initServices } from "../../../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../../../src/db/schema/projects";
import { eq, and, max } from "drizzle-orm";
import { randomUUID } from "crypto";
import { turnsContract } from "@uspark/core";
import { getUserId } from "../../../../../../../../../src/lib/auth/get-user-id";
import { InitialScanExecutor } from "../../../../../../../../../src/lib/initial-scan-executor";

type OnClaudeStdoutResponse = z.infer<
  (typeof turnsContract.onClaudeStdout.responses)[200]
>;
type TurnErrorResponse = z.infer<
  (typeof turnsContract.onClaudeStdout.responses)[401]
>;

/**
 * POST /api/projects/:projectId/sessions/:sessionId/turns/:turnId/on-claude-stdout
 * Receives Claude stdout from watch-claude and creates blocks in real-time
 *
 * Contract: turnsContract.onClaudeStdout
 */
export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      projectId: string;
      sessionId: string;
      turnId: string;
    }>;
  },
) {
  // Authenticate using CLI token (from watch-claude)
  const userId = await getUserId();

  if (!userId) {
    const error: TurnErrorResponse = { error: "unauthorized" };
    return NextResponse.json(error, { status: 401 });
  }

  initServices();
  const { projectId, sessionId, turnId } = await context.params;

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    const error: TurnErrorResponse = {
      error: "project_not_found",
      error_description: "Project not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Verify session exists
  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(
      and(
        eq(SESSIONS_TBL.id, sessionId),
        eq(SESSIONS_TBL.projectId, projectId),
      ),
    );

  if (!session) {
    const error: TurnErrorResponse = {
      error: "session_not_found",
      error_description: "Session not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Verify turn exists
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)));

  if (!turn) {
    const error: TurnErrorResponse = {
      error: "turn_not_found",
      error_description: "Turn not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Parse and validate request body
  const body = await request.json();
  const parseResult = turnsContract.onClaudeStdout.body.safeParse(body);

  if (!parseResult.success) {
    const error: TurnErrorResponse = {
      error: "invalid_request",
      error_description: parseResult.error.issues[0]?.message,
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { line } = parseResult.data;

  // Parse Claude output line
  let block: Record<string, unknown>;
  try {
    block = JSON.parse(line);
  } catch {
    const error: TurnErrorResponse = {
      error: "invalid_json",
      error_description: "Line is not valid JSON",
    };
    return NextResponse.json(error, { status: 400 });
  }

  // Use transaction with row-level locking to prevent race conditions in sequence number assignment
  await globalThis.services.db.transaction(async (tx) => {
    // Lock the turn row to prevent concurrent sequence number conflicts
    // This ensures only one transaction can assign sequence numbers at a time for this turn
    await tx
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId))
      .for("update");

    // Get current max sequence number
    // Note: Cannot use FOR UPDATE with aggregate functions in PostgreSQL
    // The turn row lock above is sufficient to prevent race conditions
    const [maxSeqResult] = await tx
      .select({ max: max(BLOCKS_TBL.sequenceNumber) })
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId));

    const sequenceNumber = (maxSeqResult?.max ?? -1) + 1;

    // Save block based on type (logic from ClaudeExecutor.saveBlock)
    await saveBlock(tx, turnId, block, sequenceNumber);

    // If this is a result block, mark turn as completed
    if (block.type === "result") {
      await tx
        .update(TURNS_TBL)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(TURNS_TBL.id, turnId));

      // Check if this is an initial scan session
      const [projectData] = await tx
        .select()
        .from(PROJECTS_TBL)
        .where(
          and(
            eq(PROJECTS_TBL.id, projectId),
            eq(PROJECTS_TBL.initialScanSessionId, sessionId),
          ),
        );

      // If this session is an initial scan, update scan status
      if (projectData) {
        await InitialScanExecutor.onScanComplete(projectId, sessionId, true);
      }
    }
  });

  const response: OnClaudeStdoutResponse = { ok: true };
  return NextResponse.json(response);
}

/**
 * Save a block to the database (moved from ClaudeExecutor)
 */
async function saveBlock(
  tx: Parameters<Parameters<typeof globalThis.services.db.transaction>[0]>[0],
  turnId: string,
  blockData: Record<string, unknown>,
  sequenceNumber: number,
): Promise<void> {
  let blockType: string;
  let blockContent: Record<string, unknown>;

  if (blockData.type === "assistant") {
    // Assistant response block
    const message = blockData.message as {
      content?: Array<Record<string, unknown>>;
    };
    const content = message?.content?.[0];

    if (content?.type === "text") {
      blockType = "content";
      blockContent = { text: content.text as string };
    } else if (content?.type === "tool_use") {
      blockType = "tool_use";
      blockContent = {
        tool_name: content.name as string,
        parameters: content.input as Record<string, unknown>,
        tool_use_id: content.id as string,
      };
    } else {
      // Skip unknown assistant content types
      return;
    }
  } else if (blockData.type === "user") {
    // User message with tool results
    const message = blockData.message as {
      content?: Array<Record<string, unknown>>;
    };
    const content = message?.content?.[0];

    if (content?.type === "tool_result") {
      blockType = "tool_result";
      blockContent = {
        tool_use_id: content.tool_use_id as string,
        result: content.content,
        error: content.is_error ? content.content : null,
      };
    } else {
      // Skip unknown user content types
      return;
    }
  } else if (blockData.type === "tool_result") {
    // Tool execution result
    blockType = "tool_result";
    blockContent = {
      tool_use_id: blockData.tool_use_id as string,
      result: blockData.content,
      error: blockData.is_error ? blockData.content : null,
    };
  } else if (blockData.type === "thinking") {
    blockType = "thinking";
    blockContent = { text: blockData.content || blockData.text };
  } else if (blockData.type === "content" || blockData.type === "text") {
    blockType = "content";
    blockContent = { text: blockData.content || blockData.text };
  } else {
    // Unknown block type or result type - skip
    return;
  }

  await tx.insert(BLOCKS_TBL).values({
    id: `block_${randomUUID()}`,
    turnId,
    type: blockType,
    content: blockContent,
    sequenceNumber,
  });
}
