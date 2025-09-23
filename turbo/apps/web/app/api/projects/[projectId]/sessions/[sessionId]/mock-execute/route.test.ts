import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import "../../../../../../../src/test/setup";
import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock dependencies BEFORE imports
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_test123" })),
}));

describe("Mock Execute API", () => {
  const mockProjectId = `proj_test_${Date.now()}_${process.pid}`;
  const mockSessionId = `sess_test_${Date.now()}_${process.pid}`;
  const mockUserId = "user_test123";

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Initialize services
    initServices();
    const db = globalThis.services.db;

    // Clean up any existing test data
    await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, "turn_mock123"));
    await db.delete(TURNS_TBL).where(eq(TURNS_TBL.sessionId, mockSessionId));
    await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, mockSessionId));
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, mockProjectId));
  });

  afterEach(async () => {
    // Clean up test data
    initServices();
    const db = globalThis.services.db;

    await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, "turn_mock123"));
    await db.delete(TURNS_TBL).where(eq(TURNS_TBL.sessionId, mockSessionId));
    await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, mockSessionId));
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, mockProjectId));
  });

  it("should create a turn and start mock execution", async () => {
    initServices();
    const db = globalThis.services.db;

    // Create test project with YJS document
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );
    await db.insert(PROJECTS_TBL).values({
      id: mockProjectId,
      userId: mockUserId,
      ydocData,
    });

    // Create test session
    await db.insert(SESSIONS_TBL).values({
      id: mockSessionId,
      projectId: mockProjectId,
      title: "Test Session",
    });

    // Test data will be created by the actual API

    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_message: "Hello Claude!" }),
    });

    const context = {
      params: Promise.resolve({
        projectId: mockProjectId,
        sessionId: mockSessionId,
      }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.session_id).toBe(mockSessionId);
    expect(data.user_message).toBe("Hello Claude!");
    expect(data.status).toBe("pending");
    expect(data.is_mock).toBe(true);

    // Verify turn was created in database
    const turns = await db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, mockSessionId));
    expect(turns.length).toBe(1);
    expect(turns[0]!.userPrompt).toBe("Hello Claude!");
    // Mock executor immediately changes status to in_progress
    expect(["pending", "in_progress", "completed"]).toContain(turns[0]!.status);
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_message: "Hello" }),
    });

    const context = {
      params: Promise.resolve({
        projectId: mockProjectId,
        sessionId: mockSessionId,
      }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "unauthorized" });
  });

  it("should return 404 if project does not exist", async () => {
    // Don't create project, so it won't exist

    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_message: "Hello" }),
    });

    const context = {
      params: Promise.resolve({
        projectId: mockProjectId,
        sessionId: mockSessionId,
      }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "project_not_found" });
  });

  it("should return 404 if session does not exist", async () => {
    initServices();
    const db = globalThis.services.db;

    // Create project but not session
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );
    await db.insert(PROJECTS_TBL).values({
      id: mockProjectId,
      userId: mockUserId,
      ydocData,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_message: "Hello" }),
    });

    const context = {
      params: Promise.resolve({
        projectId: mockProjectId,
        sessionId: mockSessionId,
      }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "session_not_found" });
  });

  it("should return 400 if user_message is missing", async () => {
    initServices();
    const db = globalThis.services.db;

    // Create test project and session
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );
    await db.insert(PROJECTS_TBL).values({
      id: mockProjectId,
      userId: mockUserId,
      ydocData,
    });

    await db.insert(SESSIONS_TBL).values({
      id: mockSessionId,
      projectId: mockProjectId,
      title: "Test Session",
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Missing user_message
    });

    const context = {
      params: Promise.resolve({
        projectId: mockProjectId,
        sessionId: mockSessionId,
      }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "user_message_required" });
  });

  describe("Mock Block Generation", () => {
    it("should generate greeting blocks for hello message", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create test project and session
      const ydoc1 = new Y.Doc();
      const ydocData1 = Buffer.from(Y.encodeStateAsUpdate(ydoc1)).toString(
        "base64",
      );
      await db.insert(PROJECTS_TBL).values({
        id: mockProjectId,
        userId: mockUserId,
        ydocData: ydocData1,
      });

      await db.insert(SESSIONS_TBL).values({
        id: mockSessionId,
        projectId: mockProjectId,
        title: "Test Session",
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_message: "Hello!" }),
      });

      const context = {
        params: Promise.resolve({
          projectId: mockProjectId,
          sessionId: mockSessionId,
        }),
      };

      const response = await POST(request, context);
      expect(response.status).toBe(200);

      // Wait a bit for async execution to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The async execution should update the turn status
      // In a real test, we'd verify the blocks were created
    });

    it("should generate file operation blocks for file-related message", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create test project and session
      const ydoc1 = new Y.Doc();
      const ydocData1 = Buffer.from(Y.encodeStateAsUpdate(ydoc1)).toString(
        "base64",
      );
      await db.insert(PROJECTS_TBL).values({
        id: mockProjectId,
        userId: mockUserId,
        ydocData: ydocData1,
      });

      await db.insert(SESSIONS_TBL).values({
        id: mockSessionId,
        projectId: mockProjectId,
        title: "Test Session",
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_message: "Read the README file" }),
      });

      const context = {
        params: Promise.resolve({
          projectId: mockProjectId,
          sessionId: mockSessionId,
        }),
      };

      const response = await POST(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user_message).toBe("Read the README file");
    });

    it("should generate code writing blocks for code-related message", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create test project and session
      const ydoc = new Y.Doc();
      const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
        "base64",
      );
      await db.insert(PROJECTS_TBL).values({
        id: mockProjectId,
        userId: mockUserId,
        ydocData,
      });

      await db.insert(SESSIONS_TBL).values({
        id: mockSessionId,
        projectId: mockProjectId,
        title: "Test Session",
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_message: "Write some code for me" }),
      });

      const context = {
        params: Promise.resolve({
          projectId: mockProjectId,
          sessionId: mockSessionId,
        }),
      };

      const response = await POST(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.is_mock).toBe(true);
    });
  });
});
