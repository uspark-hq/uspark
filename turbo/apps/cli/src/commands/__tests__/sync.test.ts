import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushCommand, pullCommand } from "../sync";
import { requireAuth } from "../shared";
import chalk from "chalk";
import * as fs from "fs/promises";
import type { Stats, Dirent } from "fs";

vi.mock("../shared");
vi.mock("fs/promises");

describe("sync commands", () => {
  const mockSync = {
    pushFile: vi.fn(),
    pullFile: vi.fn(),
    syncFromRemote: vi.fn(),
    syncToRemote: vi.fn(),
  } as unknown as any;

  const mockAuthContext = {
    token: "test-token",
    apiUrl: "https://api.test.com",
    sync: mockSync,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockAuthContext);
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("pushCommand", () => {
    it("should push a single file successfully", async () => {
      await pushCommand("test.txt", { projectId: "proj-123" });

      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "test.txt",
        "test.txt",
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pushed test.txt"),
      );
    });

    it("should push a single file with same source and remote path", async () => {
      await pushCommand("path.txt", {
        projectId: "proj-123",
      });

      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "path.txt",
        "path.txt",
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
    });

    it("should push all files with --all flag", async () => {
      // Mock getAllFiles by mocking fs operations
      vi.mocked(fs.readdir).mockResolvedValue(["file1.txt", "file2.js"] as unknown as Dirent[]);
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
      } as Stats);

      await pushCommand(undefined, {
        projectId: "proj-123",
        all: true,
      });

      // Should push all files
      expect(mockSync.pushFile).toHaveBeenCalledTimes(2);
      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "file1.txt",
        "file1.txt",
        expect.any(Object),
      );
      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "file2.js",
        "file2.js",
        expect.any(Object),
      );
    });

    it("should handle errors during batch push gracefully", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["file1.txt", "file2.txt"] as unknown as Dirent[]);
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
      } as Stats);

      // Make first file succeed, second file fail
      mockSync.pushFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Upload failed"));

      await pushCommand(undefined, {
        projectId: "proj-123",
        all: true,
      });

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("  ✓ Pushed file1.txt"),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.yellow("  ✗ Failed to push file2.txt: Upload failed"),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("\n✓ Push completed: 1 succeeded, 1 failed"),
      );
    });

    it("should throw error when no file path and no --all flag", async () => {
      await expect(
        pushCommand(undefined, { projectId: "proj-123" }),
      ).rejects.toThrow("File path is required when not using --all flag");
    });
  });

  describe("pullCommand", () => {
    it("should pull a file successfully", async () => {
      await pullCommand("test.txt", { projectId: "proj-123" });

      expect(mockSync.pullFile).toHaveBeenCalledWith(
        "proj-123",
        "test.txt",
        undefined,
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pulled to test.txt"),
      );
    });

    it("should pull a file to custom output path", async () => {
      await pullCommand("remote/file.txt", {
        projectId: "proj-123",
        output: "local/output.txt",
      });

      expect(mockSync.pullFile).toHaveBeenCalledWith(
        "proj-123",
        "remote/file.txt",
        "local/output.txt",
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pulled to local/output.txt"),
      );
    });
  });
});