import type { Block } from "../contracts/turns.contract";

/**
 * Filters and sorts blocks for display in the UI.
 *
 * Rules:
 * - Keep all tool_use blocks (to show tool calls)
 * - Keep all tool_result blocks (to show all tool outputs)
 * - Keep all other block types (text, thinking, content, code, error)
 * - Ensure tool_use blocks appear before tool_result blocks with the same index
 *
 * The sorting ensures that when tool_use and tool_result blocks have similar
 * timestamps, tool_use always appears first in the display.
 *
 * @param blocks - Array of blocks to filter and sort
 * @returns Filtered and sorted array of blocks
 *
 * @example
 * ```ts
 * const blocks = [
 *   { type: 'text', createdAt: '2024-01-01T00:00:00Z', ... },
 *   { type: 'tool_result', createdAt: '2024-01-01T00:00:02Z', ... },
 *   { type: 'tool_use', createdAt: '2024-01-01T00:00:03Z', ... },
 *   { type: 'text', createdAt: '2024-01-01T00:00:04Z', ... },
 * ];
 * const filtered = filterBlocksForDisplay(blocks);
 * // Result: text, tool_use, tool_result, text (tool_use moved before tool_result)
 * ```
 */
export function filterBlocksForDisplay(blocks: Block[]): Block[] {
  if (!blocks || blocks.length === 0) {
    return blocks;
  }

  // Keep all blocks - no filtering needed
  const filtered = blocks.filter((block) => block != null);

  // Sort blocks to ensure tool_use appears before its corresponding tool_result
  // Use tool_use_id to match pairs
  const sorted: Block[] = [];
  const toolUseMap = new Map<string, Block>();

  // First pass: identify all tool_use blocks and their IDs
  for (const block of filtered) {
    if (
      block.type === "tool_use" &&
      typeof block.content === "object" &&
      block.content !== null &&
      "tool_use_id" in block.content
    ) {
      const toolUseId = String(block.content.tool_use_id);
      toolUseMap.set(toolUseId, block);
    }
  }

  // Second pass: process blocks, ensuring tool_result comes after its tool_use
  const processedToolUseIds = new Set<string>();

  for (const block of filtered) {
    if (
      block.type === "tool_result" &&
      typeof block.content === "object" &&
      block.content !== null &&
      "tool_use_id" in block.content
    ) {
      const toolUseId = String(block.content.tool_use_id);
      const correspondingToolUse = toolUseMap.get(toolUseId);

      // If we find a tool_result before its tool_use has been processed, add the tool_use first
      if (correspondingToolUse && !processedToolUseIds.has(toolUseId)) {
        sorted.push(correspondingToolUse);
        processedToolUseIds.add(toolUseId);
      }
      sorted.push(block);
    } else if (
      block.type === "tool_use" &&
      typeof block.content === "object" &&
      block.content !== null &&
      "tool_use_id" in block.content
    ) {
      const toolUseId = String(block.content.tool_use_id);
      // Only add tool_use if it hasn't been added already (when processing its result)
      if (!processedToolUseIds.has(toolUseId)) {
        sorted.push(block);
        processedToolUseIds.add(toolUseId);
      }
    } else {
      // For non-tool blocks, just add them in order
      sorted.push(block);
    }
  }

  return sorted;
}
