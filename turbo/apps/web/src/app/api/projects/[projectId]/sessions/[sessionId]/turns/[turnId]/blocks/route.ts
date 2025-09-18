import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../../../../../lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
  type NewBlock,
} from "../../../../../../../../../db/schema/sessions";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * POST /api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/blocks
 * Add blocks to a turn
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      projectId: string;
      sessionId: string;
      turnId: string;
    };
  },
) {
  initServices();
  const { projectId, sessionId, turnId } = params;

  // Parse request body
  const body = await request.json();
  const { blocks } = body;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return NextResponse.json(
      { error: "blocks array is required and must not be empty" },
      { status: 400 },
    );
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
    )
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify turn exists
  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(and(eq(TURNS_TBL.id, turnId), eq(TURNS_TBL.sessionId, sessionId)))
    .limit(1);

  if (!turn) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  // Get the current max sequence number
  const [maxSequence] = await globalThis.services.db
    .select({ max: sql<number>`MAX(${BLOCKS_TBL.sequenceNumber})` })
    .from(BLOCKS_TBL)
    .where(eq(BLOCKS_TBL.turnId, turnId));

  const startSequence = ((maxSequence?.max as number | null) || 0) + 1;

  // Prepare blocks for insertion
  const now = new Date();
  const blocksToInsert: NewBlock[] = blocks.map(
    (block: { type: string; content: unknown }, index: number) => {
      // Validate block type
      const validTypes = ["thinking", "content", "tool_use", "tool_result"];
      if (!validTypes.includes(block.type)) {
        throw new Error(
          `Invalid block type: ${block.type}. Must be one of: ${validTypes.join(", ")}`,
        );
      }

      return {
        id: `block_${nanoid()}`,
        turnId,
        type: block.type,
        content: block.content,
        sequenceNumber: startSequence + index,
        createdAt: now,
      };
    },
  );

  // Insert blocks
  const insertedBlocks = await globalThis.services.db
    .insert(BLOCKS_TBL)
    .values(blocksToInsert)
    .returning();

  // Update session's updatedAt
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({ updatedAt: now })
    .where(eq(SESSIONS_TBL.id, sessionId));

  return NextResponse.json(
    {
      blocks: insertedBlocks,
      count: insertedBlocks.length,
    },
    { status: 201 },
  );
}
