import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProjectSync } from "../project-sync";
import { FileSystem } from "../filesystem";

describe("ProjectSync - Version Tracking", () => {
  let projectSync: ProjectSync;
  let mockFs: FileSystem;

  beforeEach(() => {
    mockFs = new FileSystem();
    projectSync = new ProjectSync(mockFs);
    vi.clearAllMocks();
  });

  describe("syncFromRemote", () => {
    it("should read and save version from X-Version header", async () => {
      const mockResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "X-Version": "42",
          "Content-Length": "2",
        },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      expect(projectSync.getVersion()).toBe(42);
    });

    it("should handle missing X-Version header", async () => {
      const mockResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "Content-Length": "2",
        },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      expect(projectSync.getVersion()).toBeNull();
    });
  });

  describe("syncToRemote", () => {
    it("should send X-Version header when version is set", async () => {
      // First, set up version by mocking a pull
      const pullResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "X-Version": "5",
        },
      });

      // Mock for initial pull
      global.fetch = vi.fn().mockResolvedValueOnce(pullResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      // Add a file to create changes
      await mockFs.writeFile("test.txt", "content");

      // Mock for push
      const pushResponse = new Response("OK", {
        status: 200,
        headers: {
          "X-Version": "6",
        },
      });

      global.fetch = vi.fn().mockResolvedValueOnce(pushResponse);

      await projectSync.syncToRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      // Verify that fetch was called with X-Version header
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(fetchCall).toBeDefined();
      const headers = fetchCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-Version"]).toBe("5");
    });

    it("should update version from response header on successful sync", async () => {
      // Set initial version
      const pullResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "X-Version": "10",
        },
      });

      global.fetch = vi.fn().mockResolvedValueOnce(pullResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      expect(projectSync.getVersion()).toBe(10);

      // Add a file to create changes
      await mockFs.writeFile("test.txt", "content");

      // Mock for push with new version
      const pushResponse = new Response("OK", {
        status: 200,
        headers: {
          "X-Version": "11",
        },
      });

      global.fetch = vi.fn().mockResolvedValueOnce(pushResponse);

      await projectSync.syncToRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      expect(projectSync.getVersion()).toBe(11);
    });

    it("should throw error on version conflict (409)", async () => {
      // Set initial version
      const pullResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "X-Version": "5",
        },
      });

      global.fetch = vi.fn().mockResolvedValueOnce(pullResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      // Add a file to create changes
      await mockFs.writeFile("test.txt", "content");

      // Mock for push with conflict
      const conflictResponse = new Response(
        JSON.stringify({ error: "Version conflict", currentVersion: 7 }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      global.fetch = vi.fn().mockResolvedValueOnce(conflictResponse);

      await expect(
        projectSync.syncToRemote("test-project", {
          token: "test-token",
          apiUrl: "https://test.com",
          verbose: false,
        }),
      ).rejects.toThrow(/Version conflict.*Local version 5.*server version 7/);
    });
  });

  describe("getVersion", () => {
    it("should return null initially", () => {
      expect(projectSync.getVersion()).toBeNull();
    });

    it("should return version after syncFromRemote", async () => {
      const mockResponse = new Response(new Uint8Array([0, 0]), {
        status: 200,
        headers: {
          "X-Version": "123",
        },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await projectSync.syncFromRemote("test-project", {
        token: "test-token",
        apiUrl: "https://test.com",
        verbose: false,
      });

      expect(projectSync.getVersion()).toBe(123);
    });
  });
});
