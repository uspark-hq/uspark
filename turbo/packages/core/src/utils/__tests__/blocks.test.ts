import { describe, it, expect } from "vitest";
import { filterBlocksForDisplay } from "../blocks";
import type { Block } from "../../contracts/turns.contract";

// Helper to create a mock block
function createBlock(
  type: Block["type"],
  id: string = `block_${Math.random()}`,
): Block {
  return {
    id,
    turnId: "turn_test",
    type,
    content: `Content for ${type}`,
    createdAt: new Date(),
  };
}

describe("filterBlocksForDisplay", () => {
  it("should return empty array for empty input", () => {
    expect(filterBlocksForDisplay([])).toEqual([]);
  });

  it("should hide all tool_use blocks", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("text", "block_3"),
      createBlock("tool_use", "block_4"),
      createBlock("text", "block_5"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_3");
    expect(result[2].id).toBe("block_5");
    expect(result.every((block) => block.type !== "tool_use")).toBe(true);
  });

  it("should keep only the last tool_result block", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("tool_result", "block_3"), // First tool_result - should be hidden
      createBlock("tool_use", "block_4"),
      createBlock("tool_result", "block_5"), // Second tool_result - should be kept
      createBlock("text", "block_6"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_5"); // Only the last tool_result
    expect(result[2].id).toBe("block_6");

    const toolResults = result.filter((block) => block.type === "tool_result");
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].id).toBe("block_5");
  });

  it("should keep all other block types", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("code", "block_2"),
      createBlock("error", "block_3"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result).toEqual(blocks);
  });

  it("should handle blocks with only tool_use (all hidden)", () => {
    const blocks: Block[] = [
      createBlock("tool_use", "block_1"),
      createBlock("tool_use", "block_2"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(0);
  });

  it("should handle blocks with only one tool_result (kept)", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_result", "block_2"),
      createBlock("text", "block_3"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result[1].type).toBe("tool_result");
  });

  it("should handle complex scenario with multiple tool sequences", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"), // Hidden
      createBlock("tool_result", "block_3"), // Hidden (not last)
      createBlock("text", "block_4"),
      createBlock("tool_use", "block_5"), // Hidden
      createBlock("tool_result", "block_6"), // Hidden (not last)
      createBlock("tool_use", "block_7"), // Hidden
      createBlock("tool_result", "block_8"), // Kept (last)
      createBlock("text", "block_9"),
      createBlock("code", "block_10"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(5);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_4");
    expect(result[2].id).toBe("block_8"); // Only the last tool_result
    expect(result[3].id).toBe("block_9");
    expect(result[4].id).toBe("block_10");

    const toolResults = result.filter((block) => block.type === "tool_result");
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].id).toBe("block_8");
  });

  it("should handle blocks with no tool_use or tool_result", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("code", "block_2"),
      createBlock("error", "block_3"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toEqual(blocks);
  });

  it("should preserve order of kept blocks", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("code", "block_3"),
      createBlock("tool_use", "block_4"),
      createBlock("error", "block_5"),
      createBlock("tool_result", "block_6"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(4);
    expect(result[0].type).toBe("text");
    expect(result[1].type).toBe("code");
    expect(result[2].type).toBe("error");
    expect(result[3].type).toBe("tool_result");
  });
});
