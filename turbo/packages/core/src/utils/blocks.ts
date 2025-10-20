import type { Block } from "../contracts/turns.contract";

/**
 * Filters blocks for display in the UI.
 *
 * Rules:
 * - Keep all tool_use blocks (to show tool calls)
 * - Keep all tool_result blocks (to show all tool outputs)
 * - Keep all other block types (text, thinking, content, code, error)
 *
 * @param blocks - Array of blocks to filter
 * @returns Filtered array of blocks (currently returns all blocks)
 *
 * @example
 * ```ts
 * const blocks = [
 *   { type: 'text', ... },
 *   { type: 'tool_use', ... },    // Kept
 *   { type: 'tool_result', ... }, // Kept
 *   { type: 'tool_use', ... },    // Kept
 *   { type: 'tool_result', ... }, // Kept
 *   { type: 'text', ... },
 * ];
 * const filtered = filterBlocksForDisplay(blocks);
 * // Result: All blocks kept
 * ```
 */
export function filterBlocksForDisplay(blocks: Block[]): Block[] {
  if (!blocks || blocks.length === 0) {
    return blocks;
  }

  // Keep all blocks - no filtering needed
  return blocks.filter((block) => block != null);
}
