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

  it("should keep all tool_use blocks", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("text", "block_3"),
      createBlock("tool_use", "block_4"),
      createBlock("text", "block_5"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(5);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_2");
    expect(result[2].id).toBe("block_3");
    expect(result[3].id).toBe("block_4");
    expect(result[4].id).toBe("block_5");
  });

  it("should keep all tool_result blocks", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("tool_result", "block_3"), // First tool_result - kept
      createBlock("tool_use", "block_4"),
      createBlock("tool_result", "block_5"), // Second tool_result - kept
      createBlock("text", "block_6"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(6);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_2");
    expect(result[2].id).toBe("block_3");
    expect(result[3].id).toBe("block_4");
    expect(result[4].id).toBe("block_5");
    expect(result[5].id).toBe("block_6");

    const toolResults = result.filter((block) => block.type === "tool_result");
    expect(toolResults).toHaveLength(2);
  });

  it("should keep all block types", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("code", "block_2"),
      createBlock("error", "block_3"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result).toEqual(blocks);
  });

  it("should handle blocks with only tool_use", () => {
    const blocks: Block[] = [
      createBlock("tool_use", "block_1"),
      createBlock("tool_use", "block_2"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(2);
    expect(result).toEqual(blocks);
  });

  it("should handle blocks with multiple tool_results", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_result", "block_2"),
      createBlock("tool_result", "block_3"),
      createBlock("text", "block_4"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(4);
    expect(result).toEqual(blocks);
  });

  it("should handle complex scenario with multiple tool sequences", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("tool_result", "block_3"),
      createBlock("text", "block_4"),
      createBlock("tool_use", "block_5"),
      createBlock("tool_result", "block_6"),
      createBlock("tool_use", "block_7"),
      createBlock("tool_result", "block_8"),
      createBlock("text", "block_9"),
      createBlock("code", "block_10"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(10);
    expect(result).toEqual(blocks);
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

  it("should preserve order of all blocks", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      createBlock("tool_use", "block_2"),
      createBlock("code", "block_3"),
      createBlock("tool_use", "block_4"),
      createBlock("error", "block_5"),
      createBlock("tool_result", "block_6"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(6);
    expect(result[0].type).toBe("text");
    expect(result[1].type).toBe("tool_use");
    expect(result[2].type).toBe("code");
    expect(result[3].type).toBe("tool_use");
    expect(result[4].type).toBe("error");
    expect(result[5].type).toBe("tool_result");
  });

  it("should filter out null or undefined blocks", () => {
    const blocks = [
      createBlock("text", "block_1"),
      null,
      createBlock("tool_use", "block_2"),
      undefined,
      createBlock("text", "block_3"),
    ] as unknown as Block[];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_2");
    expect(result[2].id).toBe("block_3");
  });

  it("should reorder tool_result to appear after tool_use when they are out of order", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      {
        id: "block_2",
        turnId: "turn_test",
        type: "tool_result" as const,
        content: { tool_use_id: "tool_123", result: "Output" },
        createdAt: new Date(),
      },
      {
        id: "block_3",
        turnId: "turn_test",
        type: "tool_use" as const,
        content: { tool_use_id: "tool_123", tool_name: "Bash", parameters: {} },
        createdAt: new Date(),
      },
      createBlock("text", "block_4"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(4);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_3"); // tool_use moved before tool_result
    expect(result[2].id).toBe("block_2"); // tool_result moved after tool_use
    expect(result[3].id).toBe("block_4");
  });

  it("should handle multiple tool_result/tool_use pairs that need reordering", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      {
        id: "block_2",
        turnId: "turn_test",
        type: "tool_result" as const,
        content: { tool_use_id: "tool_123", result: "Output 1" },
        createdAt: new Date(),
      },
      {
        id: "block_3",
        turnId: "turn_test",
        type: "tool_use" as const,
        content: { tool_use_id: "tool_123", tool_name: "Bash", parameters: {} },
        createdAt: new Date(),
      },
      {
        id: "block_4",
        turnId: "turn_test",
        type: "tool_result" as const,
        content: { tool_use_id: "tool_456", result: "Output 2" },
        createdAt: new Date(),
      },
      {
        id: "block_5",
        turnId: "turn_test",
        type: "tool_use" as const,
        content: { tool_use_id: "tool_456", tool_name: "Read", parameters: {} },
        createdAt: new Date(),
      },
      createBlock("text", "block_6"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(6);
    expect(result[0].id).toBe("block_1");
    expect(result[1].id).toBe("block_3"); // First tool_use
    expect(result[2].id).toBe("block_2"); // First tool_result
    expect(result[3].id).toBe("block_5"); // Second tool_use
    expect(result[4].id).toBe("block_4"); // Second tool_result
    expect(result[5].id).toBe("block_6");
  });

  it("should not reorder when tool_use already comes before tool_result", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      {
        id: "block_2",
        turnId: "turn_test",
        type: "tool_use" as const,
        content: { tool_use_id: "tool_123", tool_name: "Bash", parameters: {} },
        createdAt: new Date(),
      },
      {
        id: "block_3",
        turnId: "turn_test",
        type: "tool_result" as const,
        content: { tool_use_id: "tool_123", result: "Output" },
        createdAt: new Date(),
      },
      createBlock("text", "block_4"),
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(4);
    expect(result).toEqual(blocks); // Should remain unchanged
  });

  it("should handle tool_result at end of blocks array", () => {
    const blocks: Block[] = [
      createBlock("text", "block_1"),
      {
        id: "block_2",
        turnId: "turn_test",
        type: "tool_use" as const,
        content: { tool_use_id: "tool_123", tool_name: "Bash", parameters: {} },
        createdAt: new Date(),
      },
      {
        id: "block_3",
        turnId: "turn_test",
        type: "tool_result" as const,
        content: { tool_use_id: "tool_123", result: "Output" },
        createdAt: new Date(),
      },
    ];

    const result = filterBlocksForDisplay(blocks);

    expect(result).toHaveLength(3);
    expect(result).toEqual(blocks); // Should remain unchanged
  });
});
