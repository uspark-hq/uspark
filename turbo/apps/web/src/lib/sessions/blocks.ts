import { initServices } from "../init-services";
import { BLOCKS_TBL, type NewBlock } from "../../db/schema/sessions";
import { randomUUID } from "crypto";

/**
 * Internal helper functions for managing blocks
 * These are not exposed as API endpoints but used by other services
 */

/**
 * Add a single block to a turn
 */
export async function addBlock(
  turnId: string,
  type: string,
  content: unknown,
): Promise<string> {
  initServices();

  const blockId = `block_${randomUUID()}`;
  const result = await globalThis.services.db
    .insert(BLOCKS_TBL)
    .values({
      id: blockId,
      turnId,
      type,
      content: content,
    })
    .returning();

  const newBlock = result[0];
  if (!newBlock) {
    throw new Error("Failed to create block");
  }

  return newBlock.id;
}

/**
 * Add multiple blocks to a turn
 */
export async function addBlocks(
  turnId: string,
  blocks: Array<{
    type: string;
    content: unknown;
  }>,
): Promise<string[]> {
  initServices();

  // Handle empty array case
  if (blocks.length === 0) {
    return [];
  }

  const blockData: NewBlock[] = blocks.map((block) => ({
    id: `block_${randomUUID()}`,
    turnId,
    type: block.type,
    content: JSON.stringify(block.content),
  }));

  const newBlocks = await globalThis.services.db
    .insert(BLOCKS_TBL)
    .values(blockData)
    .returning();

  return newBlocks.map((b) => b.id);
}

/**
 * Helper to create different block types
 */
export const BlockFactory = {
  thinking(text: string) {
    return {
      type: "thinking",
      content: { text },
    };
  },

  content(text: string) {
    return {
      type: "content",
      content: { text },
    };
  },

  toolUse(
    toolName: string,
    parameters: Record<string, unknown>,
    toolUseId?: string,
  ) {
    return {
      type: "tool_use",
      content: {
        tool_name: toolName,
        parameters,
        tool_use_id: toolUseId || `tool_${randomUUID()}`,
      },
    };
  },

  toolResult(toolUseId: string, result: string, error?: string | null) {
    return {
      type: "tool_result",
      content: {
        tool_use_id: toolUseId,
        result,
        error: error || null,
      },
    };
  },
};
