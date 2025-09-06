import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionApiClient } from "../sessions";
import type { Session, Turn, CreateSessionRequest } from "../sessions";

describe("SessionApiClient", () => {
  let client: SessionApiClient;
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    client = new SessionApiClient("/api");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSession", () => {
    it("should fetch session details", async () => {
      const mockSession: Session = {
        id: "session-123",
        projectId: "project-456",
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        turns: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await client.getSession("project-456", "session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions/session-123",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      expect(result).toEqual(mockSession);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        client.getSession("project-456", "session-123")
      ).rejects.toThrow("Failed to fetch session: Not Found");
    });
  });

  describe("getSessionUpdates", () => {
    it("should fetch session updates without indices", async () => {
      const mockResponse = {
        session: {
          id: "session-123",
          updated_at: "2024-01-01T00:00:00Z",
        },
        new_turn_ids: [],
        updated_turns: [],
        has_active_turns: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getSessionUpdates("project-456", "session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions/session-123/updates?",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include indices in query params when provided", async () => {
      const mockResponse = {
        session: {
          id: "session-123",
          updated_at: "2024-01-01T00:01:00Z",
        },
        new_turn_ids: ["turn-1"],
        updated_turns: [],
        has_active_turns: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getSessionUpdates(
        "project-456",
        "session-123",
        0,
        2
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions/session-123/updates?last_turn_index=0&last_block_index=2",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      expect(result.new_turn_ids).toEqual(["turn-1"]);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(
        client.getSessionUpdates("project-456", "session-123")
      ).rejects.toThrow("Failed to fetch session updates: Internal Server Error");
    });
  });

  describe("createSession", () => {
    it("should create a new session", async () => {
      const request: CreateSessionRequest = {
        projectId: "project-456",
        initialMessage: "Hello, Claude!",
      };

      const mockSession: Session = {
        id: "session-789",
        projectId: "project-456",
        status: "idle",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        turns: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await client.createSession(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initialMessage: "Hello, Claude!",
          }),
        }
      );
      expect(result).toEqual(mockSession);
    });

    it("should create session without initial message", async () => {
      const request: CreateSessionRequest = {
        projectId: "project-456",
      };

      const mockSession: Session = {
        id: "session-789",
        projectId: "project-456",
        status: "idle",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        turns: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await client.createSession(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initialMessage: undefined,
          }),
        }
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe("interruptSession", () => {
    it("should interrupt a running session", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await client.interruptSession("project-456", "session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions/session-123/interrupt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    });

    it("should throw error on failed interrupt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Session not found",
      });

      await expect(
        client.interruptSession("project-456", "session-123")
      ).rejects.toThrow("Failed to interrupt session: Session not found");
    });
  });

  describe("createTurn", () => {
    it("should create a new turn in session", async () => {
      const mockTurn: Turn = {
        id: "turn-123",
        sessionId: "session-123",
        status: "running",
        userMessage: "What is TypeScript?",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        blocks: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTurn,
      });

      const result = await client.createTurn(
        "project-456",
        "session-123",
        "What is TypeScript?"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-456/sessions/session-123/turns",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: "What is TypeScript?" }),
        }
      );
      expect(result).toEqual(mockTurn);
    });

    it("should throw error on failed turn creation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(
        client.createTurn("project-456", "session-123", "Test message")
      ).rejects.toThrow("Failed to create turn: Bad Request");
    });
  });

  describe("Custom base URL", () => {
    it("should use custom base URL when provided", async () => {
      const customClient = new SessionApiClient("https://api.example.com");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "session-123" }),
      });

      await customClient.getSession("project-456", "session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/projects/project-456/sessions/session-123",
        expect.any(Object)
      );
    });
  });
});