import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addBlock, addBlocks, BlockFactory } from "./blocks";
import { initServices } from "../init-services";
import { BLOCKS_TBL, TURNS_TBL, SESSIONS_TBL } from "../../db/schema/sessions";
import { PROJECTS_TBL } from "../../db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Test BlockFactory separately as it doesn't need database
describe("BlockFactory", () => {
  describe("thinking", () => {
    it("should create thinking block with correct structure", () => {
      const block = BlockFactory.thinking("I need to analyze this problem...");

      expect(block).toEqual({
        type: "thinking",
        content: {
          text: "I need to analyze this problem...",
        },
      });
    });

    it("should handle multiline text", () => {
      const text = `First line
Second line
Third line`;
      const block = BlockFactory.thinking(text);

      expect(block.content.text).toBe(text);
    });
  });

  describe("content", () => {
    it("should create content block with correct structure", () => {
      const block = BlockFactory.content(
        "Here is the answer to your question.",
      );

      expect(block).toEqual({
        type: "content",
        content: {
          text: "Here is the answer to your question.",
        },
      });
    });

    it("should handle empty string", () => {
      const block = BlockFactory.content("");
      expect(block.content.text).toBe("");
    });
  });

  describe("toolUse", () => {
    it("should create tool_use block with provided tool_use_id", () => {
      const block = BlockFactory.toolUse(
        "read_file",
        { path: "/test.txt" },
        "custom_tool_id_123",
      );

      expect(block).toEqual({
        type: "tool_use",
        content: {
          tool_name: "read_file",
          parameters: { path: "/test.txt" },
          tool_use_id: "custom_tool_id_123",
        },
      });
    });

    it("should generate tool_use_id if not provided", () => {
      const block = BlockFactory.toolUse("write_file", {
        path: "/output.txt",
        content: "Hello",
      });

      expect(block.type).toBe("tool_use");
      expect(block.content.tool_name).toBe("write_file");
      expect(block.content.parameters).toEqual({
        path: "/output.txt",
        content: "Hello",
      });
      expect(block.content.tool_use_id).toMatch(/^tool_/);
    });

    it("should handle empty parameters", () => {
      const block = BlockFactory.toolUse("list_files", {});

      expect(block.content.parameters).toEqual({});
    });

    it("should handle complex nested parameters", () => {
      const parameters = {
        command: "search",
        options: {
          recursive: true,
          pattern: "*.ts",
          excludes: ["node_modules", ".git"],
        },
        limit: 100,
      };

      const block = BlockFactory.toolUse("execute", parameters);
      expect(block.content.parameters).toEqual(parameters);
    });
  });

  describe("toolResult", () => {
    it("should create tool_result block with success result", () => {
      const block = BlockFactory.toolResult(
        "tool_123",
        "File contents: Hello World",
      );

      expect(block).toEqual({
        type: "tool_result",
        content: {
          tool_use_id: "tool_123",
          result: "File contents: Hello World",
          error: null,
        },
      });
    });

    it("should create tool_result block with error", () => {
      const block = BlockFactory.toolResult(
        "tool_456",
        "",
        "File not found: /missing.txt",
      );

      expect(block).toEqual({
        type: "tool_result",
        content: {
          tool_use_id: "tool_456",
          result: "",
          error: "File not found: /missing.txt",
        },
      });
    });

    it("should handle null error explicitly", () => {
      const block = BlockFactory.toolResult("tool_789", "Success", null);

      expect(block.content.error).toBeNull();
    });

    it("should handle undefined error as null", () => {
      const block = BlockFactory.toolResult("tool_789", "Success");

      expect(block.content.error).toBeNull();
    });

    it("should handle long result strings", () => {
      const longResult = "x".repeat(10000);
      const block = BlockFactory.toolResult("tool_long", longResult);

      expect(block.content.result).toBe(longResult);
      expect(block.content.result.length).toBe(10000);
    });
  });
});

// Test database functions separately
describe("Blocks Database Functions", () => {
  const projectId = `proj_blocks_helper_${Date.now()}`;
  const sessionId = `sess_blocks_helper_${Date.now()}`;
  const turnId = `turn_blocks_helper_${Date.now()}`;
  const userId = "test-user-blocks-helper";
  let createdBlockIds: string[] = [];

  beforeEach(async () => {
    // Initialize services
    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Create test session
    await globalThis.services.db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: "Test Session for Blocks",
    });

    // Create test turn
    await globalThis.services.db.insert(TURNS_TBL).values({
      id: turnId,
      sessionId,
      userPrompt: "Test prompt",
      status: "running",
    });

    createdBlockIds = [];
  });

  afterEach(async () => {
    // Clean up blocks
    for (const blockId of createdBlockIds) {
      await globalThis.services.db
        .delete(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.id, blockId));
    }

    // Clean up turn
    await globalThis.services.db
      .delete(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    // Clean up session
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("addBlock", () => {
    it("should add a single block and return its ID", async () => {
      const content = { text: "This is a thinking block" };
      const blockId = await addBlock(turnId, "thinking", content, 0);

      expect(blockId).toBeDefined();
      expect(blockId).toMatch(/^block_/);
      createdBlockIds.push(blockId);

      // Verify in database
      const [block] = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.id, blockId));

      expect(block).toBeDefined();
      expect(block!.turnId).toBe(turnId);
      expect(block!.type).toBe("thinking");
      expect(block!.sequenceNumber).toBe(0);
      expect(JSON.parse(block!.content)).toEqual(content);
    });

    it("should handle complex content objects", async () => {
      const content = {
        tool_name: "read_file",
        parameters: {
          path: "/test/file.txt",
          encoding: "utf-8",
        },
        tool_use_id: "tool_test_123",
      };

      const blockId = await addBlock(turnId, "tool_use", content, 5);
      createdBlockIds.push(blockId);

      const [block] = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.id, blockId));

      expect(block!.type).toBe("tool_use");
      expect(block!.sequenceNumber).toBe(5);
      expect(JSON.parse(block!.content)).toEqual(content);
    });

    it("should throw error if turn doesn't exist", async () => {
      await expect(
        addBlock("non-existent-turn", "content", { text: "test" }, 0),
      ).rejects.toThrow();
    });
  });

  describe("addBlocks", () => {
    it("should add multiple blocks with sequential numbering", async () => {
      const blocks = [
        { type: "thinking", content: { text: "Thinking..." } },
        { type: "content", content: { text: "The answer is 42" } },
        { type: "content", content: { text: "Here's why..." } },
      ];

      const blockIds = await addBlocks(turnId, blocks);

      expect(blockIds).toHaveLength(3);
      blockIds.forEach((id) => {
        expect(id).toMatch(/^block_/);
        createdBlockIds.push(id);
      });

      // Verify in database
      const dbBlocks = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId))
        .orderBy(BLOCKS_TBL.sequenceNumber);

      expect(dbBlocks).toHaveLength(3);
      expect(dbBlocks[0]!.type).toBe("thinking");
      expect(dbBlocks[0]!.sequenceNumber).toBe(0);
      expect(JSON.parse(dbBlocks[0]!.content)).toEqual({ text: "Thinking..." });

      expect(dbBlocks[1]!.type).toBe("content");
      expect(dbBlocks[1]!.sequenceNumber).toBe(1);
      expect(JSON.parse(dbBlocks[1]!.content)).toEqual({
        text: "The answer is 42",
      });

      expect(dbBlocks[2]!.type).toBe("content");
      expect(dbBlocks[2]!.sequenceNumber).toBe(2);
      expect(JSON.parse(dbBlocks[2]!.content)).toEqual({
        text: "Here's why...",
      });
    });

    it("should respect startSequence parameter", async () => {
      const blocks = [
        { type: "content", content: { text: "First" } },
        { type: "content", content: { text: "Second" } },
      ];

      const blockIds = await addBlocks(turnId, blocks, 10);
      createdBlockIds.push(...blockIds);

      const dbBlocks = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId))
        .orderBy(BLOCKS_TBL.sequenceNumber);

      expect(dbBlocks[0]!.sequenceNumber).toBe(10);
      expect(dbBlocks[1]!.sequenceNumber).toBe(11);
    });

    it("should handle empty array", async () => {
      const blockIds = await addBlocks(turnId, []);
      expect(blockIds).toEqual([]);
    });

    it("should handle large batch of blocks", async () => {
      const blocks = Array.from({ length: 50 }, (_, i) => ({
        type: "content",
        content: { text: `Block ${i}` },
      }));

      const blockIds = await addBlocks(turnId, blocks);
      expect(blockIds).toHaveLength(50);
      createdBlockIds.push(...blockIds);

      const dbBlocks = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId));

      expect(dbBlocks).toHaveLength(50);
    });
  });

  describe("Integration", () => {
    it("should work end-to-end with BlockFactory and addBlocks", async () => {
      const blocks = [
        BlockFactory.thinking("Let me search for that file..."),
        BlockFactory.toolUse(
          "read_file",
          { path: "/readme.md" },
          "tool_read_1",
        ),
        BlockFactory.toolResult(
          "tool_read_1",
          "# README\nThis is a test file.",
        ),
        BlockFactory.content(
          "I found the README file. It contains a header and description.",
        ),
      ];

      const blockIds = await addBlocks(turnId, blocks);
      expect(blockIds).toHaveLength(4);
      createdBlockIds.push(...blockIds);

      // Verify complete flow in database
      const dbBlocks = await globalThis.services.db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId))
        .orderBy(BLOCKS_TBL.sequenceNumber);

      expect(dbBlocks).toHaveLength(4);

      // Verify thinking block
      expect(dbBlocks[0]!.type).toBe("thinking");
      const thinking = JSON.parse(dbBlocks[0]!.content);
      expect(thinking.text).toBe("Let me search for that file...");

      // Verify tool_use block
      expect(dbBlocks[1]!.type).toBe("tool_use");
      const toolUse = JSON.parse(dbBlocks[1]!.content);
      expect(toolUse.tool_name).toBe("read_file");
      expect(toolUse.tool_use_id).toBe("tool_read_1");

      // Verify tool_result block
      expect(dbBlocks[2]!.type).toBe("tool_result");
      const toolResult = JSON.parse(dbBlocks[2]!.content);
      expect(toolResult.tool_use_id).toBe("tool_read_1");
      expect(toolResult.result).toContain("README");

      // Verify content block
      expect(dbBlocks[3]!.type).toBe("content");
      const content = JSON.parse(dbBlocks[3]!.content);
      expect(content.text).toContain("found the README file");
    });
  });
});
