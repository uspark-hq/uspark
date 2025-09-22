import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET, PUT, DELETE } from "./route";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../src/lib/init-services";
import { CLAUDE_TOKENS_TBL } from "../../../src/db/schema/claude-tokens";

// Mock dependencies
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

// Mock the crypto functions
vi.mock("../../../src/lib/claude-token-crypto", () => ({
  encryptClaudeToken: vi.fn((token) => `encrypted_${token}`),
  getTokenPrefix: vi.fn((token) => token.substring(0, 10) + "..."),
  isValidClaudeToken: vi.fn((token) => token && token.length >= 30),
}));

describe("/api/claude-token", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.services = {
      db: mockDb as any,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/claude-token", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "unauthorized" });
    });

    it("should return null when no token exists", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ token: null });
      expect(initServices).toHaveBeenCalled();
    });

    it("should return token metadata when token exists", async () => {
      const mockToken = {
        userId: "user123",
        tokenPrefix: "claude_tok...",
        lastUsedAt: new Date("2024-01-01"),
        lastErrorAt: null,
        lastErrorMessage: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toEqual(mockToken);
      expect(data.token.encryptedToken).toBeUndefined(); // Should NOT include encrypted token
    });
  });

  describe("PUT /api/claude-token", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost/api/claude-token", {
        method: "PUT",
        body: JSON.stringify({ token: "test_token" }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "unauthorized" });
    });

    it("should return 400 when token is missing", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);

      const request = new NextRequest("http://localhost/api/claude-token", {
        method: "PUT",
        body: JSON.stringify({}),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_request");
    });

    it("should return 400 when token is invalid", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);

      const request = new NextRequest("http://localhost/api/claude-token", {
        method: "PUT",
        body: JSON.stringify({ token: "short" }), // Too short
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_token");
    });

    it("should successfully upsert a valid token", async () => {
      const validToken = "claude_oauth_token_1234567890_1234567890";
      const mockResult = {
        userId: "user123",
        tokenPrefix: "claude_oau...",
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult]),
          }),
        }),
      });

      const request = new NextRequest("http://localhost/api/claude-token", {
        method: "PUT",
        body: JSON.stringify({ token: validToken }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toEqual(mockResult);
      expect(mockDb.insert).toHaveBeenCalledWith(CLAUDE_TOKENS_TBL);
    });
  });

  describe("DELETE /api/claude-token", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "unauthorized" });
    });

    it("should return 404 when no token exists", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should successfully delete an existing token", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user123" } as any);
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(CLAUDE_TOKENS_TBL);
    });
  });
});