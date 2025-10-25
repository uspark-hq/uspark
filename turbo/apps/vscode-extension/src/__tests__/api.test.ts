import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient } from "../api";

// Mock global fetch
global.fetch = vi.fn();

describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Validation", () => {
    it("should validate valid token and return user info", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          userId: "user_123",
          email: "test@example.com",
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ApiClient("https://test.uspark.ai");
      const user = await client.validateToken("usp_live_valid_token");

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.uspark.ai/api/auth/me",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer usp_live_valid_token",
            "Content-Type": "application/json",
          },
        },
      );
    });

    it("should return null for invalid token", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ApiClient();
      const user = await client.validateToken("invalid_token");

      expect(user).toBeNull();
    });

    it("should return null on network error", async () => {
      (global.fetch as any).mockRejectedValue(new Error("Network error"));

      const client = new ApiClient();
      const user = await client.validateToken("usp_live_token");

      expect(user).toBeNull();
    });

    it("should use default API URL when not specified", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          userId: "user_123",
          email: "test@example.com",
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ApiClient();
      await client.validateToken("usp_live_token");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.uspark.ai/api/auth/me",
        expect.any(Object),
      );
    });

    it("should use custom API URL when specified", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          userId: "user_123",
          email: "test@example.com",
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const client = new ApiClient("https://custom.example.com");
      await client.validateToken("usp_live_token");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://custom.example.com/api/auth/me",
        expect.any(Object),
      );
    });
  });

  describe("getApiUrl", () => {
    it("should return default API URL", () => {
      const client = new ApiClient();
      expect(client.getApiUrl()).toBe("https://www.uspark.ai");
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
        "[Uspark] Sync not yet implemented for project project-123",
      );

      consoleLogSpy.mockRestore();
    });
  });
});
