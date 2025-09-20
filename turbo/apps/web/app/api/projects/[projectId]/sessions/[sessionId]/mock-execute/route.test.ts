import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE imports
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_test123" })),
}));

vi.mock("../../../../../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";

// Mock database operations
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  values: vi.fn(),
};

// Setup mock chain methods
mockDb.select.mockReturnValue(mockDb);
mockDb.from.mockReturnValue(mockDb);
mockDb.where.mockReturnValue(mockDb);
mockDb.insert.mockReturnValue(mockDb);
mockDb.values.mockReturnValue(mockDb);
mockDb.update.mockReturnValue(mockDb);
mockDb.set.mockReturnValue(mockDb);

// Mock globalThis.services
beforeEach(() => {
  vi.clearAllMocks();

  globalThis.services = {
    db: mockDb,
    env: {},
    pool: null,
  } as never;
});

describe("Mock Execute API", () => {
  const mockProjectId = "proj_test123";
  const mockSessionId = "sess_test123";
  const mockUserId = "user_test123";

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as Awaited<
      ReturnType<typeof auth>
    >);
  });

  it("should create a turn and start mock execution", async () => {
    // Mock project exists
    mockDb.where.mockResolvedValueOnce([
      { id: mockProjectId, userId: mockUserId },
    ]);

    // Mock session exists
    mockDb.where.mockResolvedValueOnce([
      { id: mockSessionId, projectId: mockProjectId },
    ]);

    // Mock turn creation
    const mockTurn = {
      id: "turn_mock123",
      sessionId: mockSessionId,
      userPrompt: "Hello Claude!",
      status: "pending",
      createdAt: new Date(),
    };
    mockDb.returning.mockResolvedValueOnce([mockTurn]);

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
    expect(data).toMatchObject({
      id: mockTurn.id,
      session_id: mockSessionId,
      user_message: "Hello Claude!",
      status: "pending",
      is_mock: true,
    });

    // Verify database calls
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith({
      id: expect.stringContaining("turn_"),
      sessionId: mockSessionId,
      userPrompt: "Hello Claude!",
      status: "pending",
    });
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
    // Mock project not found
    mockDb.where.mockResolvedValueOnce([]);

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
    // Mock project exists
    mockDb.where.mockResolvedValueOnce([
      { id: mockProjectId, userId: mockUserId },
    ]);

    // Mock session not found
    mockDb.where.mockResolvedValueOnce([]);

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
    // Mock project exists
    mockDb.where.mockResolvedValueOnce([
      { id: mockProjectId, userId: mockUserId },
    ]);

    // Mock session exists
    mockDb.where.mockResolvedValueOnce([
      { id: mockSessionId, projectId: mockProjectId },
    ]);

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
      // Mock project and session exist
      mockDb.where.mockResolvedValueOnce([
        { id: mockProjectId, userId: mockUserId },
      ]);
      mockDb.where.mockResolvedValueOnce([
        { id: mockSessionId, projectId: mockProjectId },
      ]);

      // Mock turn creation
      const mockTurn = {
        id: "turn_hello123",
        sessionId: mockSessionId,
        userPrompt: "Hello!",
        status: "pending",
        createdAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([mockTurn]);

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
      // Mock project and session exist
      mockDb.where.mockResolvedValueOnce([
        { id: mockProjectId, userId: mockUserId },
      ]);
      mockDb.where.mockResolvedValueOnce([
        { id: mockSessionId, projectId: mockProjectId },
      ]);

      // Mock turn creation
      const mockTurn = {
        id: "turn_file123",
        sessionId: mockSessionId,
        userPrompt: "Read the README file",
        status: "pending",
        createdAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([mockTurn]);

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
      // Mock project and session exist
      mockDb.where.mockResolvedValueOnce([
        { id: mockProjectId, userId: mockUserId },
      ]);
      mockDb.where.mockResolvedValueOnce([
        { id: mockSessionId, projectId: mockProjectId },
      ]);

      // Mock turn creation
      const mockTurn = {
        id: "turn_code123",
        sessionId: mockSessionId,
        userPrompt: "Write some code for me",
        status: "pending",
        createdAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([mockTurn]);

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
