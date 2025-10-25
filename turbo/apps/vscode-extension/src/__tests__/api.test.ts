import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse, server } from "../test/msw-setup";

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock("../logger", () => ({
  logger: {
    init: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  },
}));

import { ApiClient } from "../api";
import { logger } from "../logger";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Validation", () => {
    it("should validate valid token and return user info", async () => {
      server.use(
        http.get("https://test.uspark.ai/api/auth/me", () => {
          return HttpResponse.json({
            userId: "user_123",
            email: "test@example.com",
          });
        }),
      );

      const client = new ApiClient("https://test.uspark.ai");
      const user = await client.validateToken("usp_live_valid_token");

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
      });
    });

    it("should return null for invalid token", async () => {
      server.use(
        http.get("https://test.uspark.ai/api/auth/me", () => {
          return new HttpResponse(null, { status: 401 });
        }),
      );

      const client = new ApiClient("https://test.uspark.ai");
      const user = await client.validateToken("invalid_token");

      expect(user).toBeNull();
    });

    it("should return null on network error", async () => {
      server.use(
        http.get("https://test.uspark.ai/api/auth/me", () => {
          return HttpResponse.error();
        }),
      );

      const client = new ApiClient("https://test.uspark.ai");
      const user = await client.validateToken("usp_live_token");

      expect(user).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to validate token",
        expect.any(Error),
      );
    });

    it("should use default API URL when not specified", async () => {
      const defaultUrl = process.env.USPARK_API_URL || "https://www.uspark.ai";

      server.use(
        http.get(`${defaultUrl}/api/auth/me`, () => {
          return HttpResponse.json({
            userId: "user_123",
            email: "test@example.com",
          });
        }),
      );

      const client = new ApiClient();
      const user = await client.validateToken("usp_live_token");

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
      });
    });

    it("should use custom API URL when specified", async () => {
      server.use(
        http.get("https://custom.example.com/api/auth/me", () => {
          return HttpResponse.json({
            userId: "user_123",
            email: "test@example.com",
          });
        }),
      );

      const client = new ApiClient("https://custom.example.com");
      const user = await client.validateToken("usp_live_token");

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
      });
    });
  });

  describe("getApiUrl", () => {
    it("should return default API URL", () => {
      const client = new ApiClient();
      const defaultUrl = process.env.USPARK_API_URL || "https://www.uspark.ai";
      expect(client.getApiUrl()).toBe(defaultUrl);
    });

    it("should return custom API URL", () => {
      const client = new ApiClient("https://custom.example.com");
      expect(client.getApiUrl()).toBe("https://custom.example.com");
    });
  });

  describe("Sync", () => {
    it("should log sync call (placeholder)", async () => {
      const client = new ApiClient();
      await client.sync("usp_live_token", "project-123", "/tmp/workdir");

      expect(logger.info).toHaveBeenCalledWith(
        "Sync not yet implemented for project project-123",
      );
    });
  });
});
