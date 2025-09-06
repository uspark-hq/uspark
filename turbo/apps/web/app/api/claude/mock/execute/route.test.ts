import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import { initServices } from "../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

describe("Mock Executor with Real Database", () => {
  let testProjectId: string;
  let db: ReturnType<typeof globalThis.services.db>;

  beforeEach(async () => {
    initServices();
    db = globalThis.services.db;

    // Clean up test data
    await db.delete(BLOCKS_TBL);
    await db.delete(TURNS_TBL);
    await db.delete(SESSIONS_TBL);

    // Create a test project with YDoc data
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ytext.insert(0, "// Initial test content\n");
    const ydocData = Y.encodeStateAsUpdate(ydoc);
    const ydocBase64 = Buffer.from(ydocData).toString("base64");

    const [project] = await db
      .insert(PROJECTS_TBL)
      .values({
        id: `test_proj_${Date.now()}`,
        userId: "test_user",
        ydocData: ydocBase64,
        version: 0,
      })
      .returning();

    testProjectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testProjectId) {
      await db.delete(BLOCKS_TBL);
      await db.delete(TURNS_TBL);
      await db.delete(SESSIONS_TBL);
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, testProjectId));
    }
  });

  describe("POST /api/claude/mock/execute", () => {
    it("should create a new session and turn", async () => {
      const body = {
        projectId: testProjectId,
        message: "Test message",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("turnId");
      expect(data).toHaveProperty("sessionId");
      expect(data).toHaveProperty("status", "running");
      expect(data).toHaveProperty("message", "Mock execution started");

      // Verify in database
      const [session] = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, data.sessionId))
        .limit(1);

      expect(session).toBeDefined();
      expect(session.projectId).toBe(testProjectId);

      const [turn] = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, data.turnId))
        .limit(1);

      expect(turn).toBeDefined();
      expect(turn.sessionId).toBe(data.sessionId);
      expect(turn.userPrompt).toBe("Test message");
      expect(turn.status).toBe("running");
    });

    it("should use existing session if provided", async () => {
      // First create a session
      const [session] = await db
        .insert(SESSIONS_TBL)
        .values({
          projectId: testProjectId,
          title: "Test session",
        })
        .returning();

      const body = {
        projectId: testProjectId,
        sessionId: session.id,
        message: "Test message with existing session",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe(session.id);

      // Verify turn was created for existing session
      const [turn] = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, data.turnId))
        .limit(1);

      expect(turn.sessionId).toBe(session.id);
    });

    it("should return 400 for missing required fields", async () => {
      const body = {
        projectId: testProjectId,
        // Missing message
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Missing required fields");
    });

    it("should return 404 for non-existent session", async () => {
      const body = {
        projectId: testProjectId,
        sessionId: "non_existent_session",
        message: "Test message",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error", "Session not found");
    });
  });

  describe("GET /api/claude/mock/execute", () => {
    it("should return 400 when sessionId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "sessionId is required");
    });

    it("should return 404 for non-existent session", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute?sessionId=non_existent",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error", "Session not found");
    });

    it("should return session with turns", async () => {
      // Create session
      const [session] = await db
        .insert(SESSIONS_TBL)
        .values({
          projectId: testProjectId,
          title: "Test session",
        })
        .returning();

      // Create turns
      const [turn1] = await db
        .insert(TURNS_TBL)
        .values({
          sessionId: session.id,
          userPrompt: "First message",
          status: "completed",
        })
        .returning();

      const [turn2] = await db
        .insert(TURNS_TBL)
        .values({
          sessionId: session.id,
          userPrompt: "Second message",
          status: "running",
        })
        .returning();

      const request = new NextRequest(
        `http://localhost:3000/api/claude/mock/execute?sessionId=${session.id}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe(session.id);
      expect(data.session).toBeDefined();
      expect(data.turns).toHaveLength(2);
      expect(data.turns[0].id).toBe(turn1.id);
      expect(data.turns[1].id).toBe(turn2.id);
    });

    it("should return specific turn with blocks", async () => {
      // Create session
      const [session] = await db
        .insert(SESSIONS_TBL)
        .values({
          projectId: testProjectId,
          title: "Test session",
        })
        .returning();

      // Create turn
      const [turn] = await db
        .insert(TURNS_TBL)
        .values({
          sessionId: session.id,
          userPrompt: "Test message",
          status: "completed",
        })
        .returning();

      // Create blocks
      await db.insert(BLOCKS_TBL).values([
        {
          turnId: turn.id,
          type: "thinking",
          content: { text: "Thinking..." },
          sequenceNumber: 0,
        },
        {
          turnId: turn.id,
          type: "content",
          content: { text: "Response content" },
          sequenceNumber: 1,
        },
      ]);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/mock/execute?sessionId=${session.id}&turnId=${turn.id}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(turn.id);
      expect(data.blocks).toHaveLength(2);
      expect(data.blocks[0].type).toBe("thinking");
      expect(data.blocks[1].type).toBe("content");
      expect(data.blocks[0].sequenceNumber).toBe(0);
      expect(data.blocks[1].sequenceNumber).toBe(1);
    });

    it("should return 404 for non-existent turn", async () => {
      // Create session
      const [session] = await db
        .insert(SESSIONS_TBL)
        .values({
          projectId: testProjectId,
          title: "Test session",
        })
        .returning();

      const request = new NextRequest(
        `http://localhost:3000/api/claude/mock/execute?sessionId=${session.id}&turnId=non_existent_turn`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error", "Turn not found");
    });
  });

  describe("Block generation", () => {
    it("should generate blocks after execution", async () => {
      const body = {
        projectId: testProjectId,
        message: "Generate blocks test",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const { turnId } = data;

      // Wait for blocks to be generated
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Check blocks were created
      const blocks = await db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId));

      expect(blocks.length).toBeGreaterThan(0);

      // Check turn status was updated
      const [turn] = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turnId))
        .limit(1);

      expect(turn.status).toBe("completed");
      expect(turn.completedAt).toBeDefined();

      // Verify block types
      const blockTypes = blocks.map((b) => b.type);
      expect(blockTypes).toContain("thinking");
      expect(blockTypes).toContain("content");
      expect(blockTypes).toContain("tool_use");
      expect(blockTypes).toContain("tool_result");
    }, 10000); // Increase timeout for async operations
  });

  describe("YDoc modification", () => {
    it("should modify project YDoc during execution", async () => {
      const body = {
        projectId: testProjectId,
        message: "Modify document test",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/claude/mock/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Check if YDoc was modified
      const [project] = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId))
        .limit(1);

      // Decode and check YDoc content
      const ydoc = new Y.Doc();
      const ydocContent = Buffer.from(project.ydocData, "base64");
      Y.applyUpdate(ydoc, new Uint8Array(ydocContent));

      const ytext = ydoc.getText("content");
      const content = ytext.toString();

      expect(content).toContain("// Initial test content");
      expect(content).toContain("// Mock change by Claude Code simulator");
      expect(content).toContain("function simulatedFunction()");
      expect(project.version).toBeGreaterThan(0);
    }, 10000);
  });
});
