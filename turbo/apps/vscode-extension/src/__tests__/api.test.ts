import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient } from "../api";
import { http, HttpResponse, server } from "../test/msw-setup";

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

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const client = new ApiClient("https://test.uspark.ai");
      const user = await client.validateToken("usp_live_token");

      expect(user).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[uSpark] Failed to validate token:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
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
      const consoleLogSpy = vi.spyOn(console, "log");

      const client = new ApiClient();
      await client.sync("usp_live_token", "project-123", "/tmp/workdir");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[uSpark] Sync not yet implemented for project project-123",
      );

      consoleLogSpy.mockRestore();
    });
  });
});
