import type { Block } from "../contracts/turns.contract";

/**
 * Filters blocks for display in the UI.
 *
 * Rules:
 * - Hide all tool_use blocks
 * - Keep only the last tool_result block (if multiple exist)
 * - Keep all other block types (text, thinking, content, code, error)
 *
 * @param blocks - Array of blocks to filter
 * @returns Filtered array of blocks
 *
 * @example
 * ```ts
 * const blocks = [
 *   { type: 'text', ... },
 *   { type: 'tool_use', ... },    // Hidden
 *   { type: 'tool_result', ... }, // Hidden (not last)
 *   { type: 'tool_use', ... },    // Hidden
 *   { type: 'tool_result', ... }, // Kept (last one)
 *   { type: 'text', ... },
 * ];
 * const filtered = filterBlocksForDisplay(blocks);
 * // Result: [text, tool_result (last), text]
 * ```
 */
export function filterBlocksForDisplay(blocks: Block[]): Block[] {
  if (!blocks || blocks.length === 0) {
    return blocks;
  }

  const filtered: Block[] = [];
  let lastToolResultIndex = -1;

  // First pass: Find the last tool_result index
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (!block) continue;
    if (block.type === "tool_result") {
      lastToolResultIndex = i;
      break;
    }
  }

  // Second pass: Apply filtering rules
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;

    // Hide all tool_use blocks
    if (block.type === "tool_use") {
      continue;
    }

    // Keep only the last tool_result
    if (block.type === "tool_result") {
      if (i === lastToolResultIndex) {
        filtered.push(block);
      }
      continue;
    }

    // Keep all other block types
    filtered.push(block);
  }

  return filtered;
}
