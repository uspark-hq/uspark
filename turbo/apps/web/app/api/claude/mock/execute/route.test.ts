import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

// Mock the init-services module
vi.mock("../../../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

// Mock the database operations
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

// Mock YJS
vi.mock("yjs", () => {
  const mockYDoc = {
    getText: vi.fn(() => ({
      toString: vi.fn(() => "existing content"),
      insert: vi.fn(),
    })),
  };

  return {
    Doc: vi.fn(() => mockYDoc),
    applyUpdate: vi.fn(),
    encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
  };
});

// Mock global services
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Setup global services mock
  globalThis.services = {
    db: mockDb,
    env: {},
    pool: null,
  } as typeof globalThis.services;

  // Setup method chaining
  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.update.mockReturnThis();
  mockDb.set.mockReturnThis();

  // Final methods in chains return promises
  mockDb.limit.mockImplementation(() =>
    Promise.resolve([
      {
        id: "proj_test_123",
        ydocData: Buffer.from("test").toString("base64"),
        version: 1,
      },
    ]),
  );

  // For update chain, where is the last method that returns a promise
  mockDb.where.mockImplementation(function () {
    // If called from update chain, return promise
    if (this === mockDb && mockDb.update.mock.calls.length > 0) {
      return Promise.resolve({ rowCount: 1 });
    }
    // Otherwise return this for chaining
    return this;
  });
});

describe("POST /api/claude/mock/execute", () => {
  it("should start a mock execution successfully", async () => {
    const body = {
      projectId: "proj_test_123",
      sessionId: "session_test_456",
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
    expect(data).toHaveProperty("sessionId", "session_test_456");
    expect(data).toHaveProperty("status", "running");
    expect(data).toHaveProperty("message", "Mock execution started");
  });

  it("should return 400 for missing required fields", async () => {
    const body = {
      projectId: "proj_test_123",
      // Missing sessionId and message
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

  it("should handle invalid JSON gracefully", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("error", "Failed to start mock execution");
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

  it("should return session data after creating a turn", async () => {
    // First create a turn
    const createBody = {
      projectId: "proj_test_123",
      sessionId: "session_test_789",
      message: "Test message",
    };

    const createRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify(createBody),
      },
    );

    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();

    expect(createResponse.status).toBe(200);
    const { turnId } = createData;

    // Then query the session
    const getRequest = new NextRequest(
      `http://localhost:3000/api/claude/mock/execute?sessionId=session_test_789`,
    );

    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getData).toHaveProperty("sessionId", "session_test_789");
    expect(getData).toHaveProperty("turns");
    expect(Array.isArray(getData.turns)).toBe(true);
    expect(getData.turns.length).toBeGreaterThan(0);
    expect(getData.turns[0]).toHaveProperty("id", turnId);
    expect(getData.turns[0]).toHaveProperty("userMessage", "Test message");
    expect(getData.turns[0]).toHaveProperty("status", "running");
  });

  it("should return specific turn data when turnId is provided", async () => {
    // First create a turn
    const createBody = {
      projectId: "proj_test_123",
      sessionId: "session_test_turn",
      message: "Test turn message",
    };

    const createRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify(createBody),
      },
    );

    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();
    const { turnId } = createData;

    // Query specific turn
    const getRequest = new NextRequest(
      `http://localhost:3000/api/claude/mock/execute?sessionId=session_test_turn&turnId=${turnId}`,
    );

    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getData).toHaveProperty("id", turnId);
    expect(getData).toHaveProperty("sessionId", "session_test_turn");
    expect(getData).toHaveProperty("userMessage", "Test turn message");
    expect(getData).toHaveProperty("status", "running");
    expect(getData).toHaveProperty("blocks");
    expect(Array.isArray(getData.blocks)).toBe(true);
  });

  it("should return 404 for non-existent turn", async () => {
    // First create a session
    const createBody = {
      projectId: "proj_test_123",
      sessionId: "session_with_turn",
      message: "Test message",
    };

    const createRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify(createBody),
      },
    );

    await POST(createRequest);

    // Query non-existent turn
    const getRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute?sessionId=session_with_turn&turnId=non_existent_turn",
    );

    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(404);
    expect(getData).toHaveProperty("error", "Turn not found");
  });
});

describe("Mock executor turn tracking", () => {
  it("should track turn with initial running status", async () => {
    const body = {
      projectId: "proj_test_123",
      sessionId: "session_status_test",
      message: "Test status tracking",
    };

    const createRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createData).toHaveProperty("turnId");
    expect(createData.status).toBe("running");

    const { turnId } = createData;

    // Immediately query the turn to check initial state
    const getRequest = new NextRequest(
      `http://localhost:3000/api/claude/mock/execute?sessionId=session_status_test&turnId=${turnId}`,
    );

    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getData).toHaveProperty("id", turnId);
    expect(getData).toHaveProperty("status", "running");
    expect(getData).toHaveProperty("blocks");
    expect(Array.isArray(getData.blocks)).toBe(true);
    expect(getData.blocks.length).toBe(0); // No blocks initially
  });

  it("should handle multiple turns in a session", async () => {
    const sessionId = "session_multi_turn";

    // Create first turn
    const firstRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify({
          projectId: "proj_test_123",
          sessionId,
          message: "First message",
        }),
      },
    );

    const firstResponse = await POST(firstRequest);
    const firstData = await firstResponse.json();

    // Create second turn
    const secondRequest = new NextRequest(
      "http://localhost:3000/api/claude/mock/execute",
      {
        method: "POST",
        body: JSON.stringify({
          projectId: "proj_test_123",
          sessionId,
          message: "Second message",
        }),
      },
    );

    const secondResponse = await POST(secondRequest);
    const secondData = await secondResponse.json();

    // Query all turns in session
    const getRequest = new NextRequest(
      `http://localhost:3000/api/claude/mock/execute?sessionId=${sessionId}`,
    );

    const getResponse = await GET(getRequest);
    const sessionData = await getResponse.json();

    expect(sessionData.turns.length).toBe(2);
    expect(sessionData.turns[0].id).toBe(firstData.turnId);
    expect(sessionData.turns[1].id).toBe(secondData.turnId);
    expect(sessionData.turns[0].userMessage).toBe("First message");
    expect(sessionData.turns[1].userMessage).toBe("Second message");
  });
});
