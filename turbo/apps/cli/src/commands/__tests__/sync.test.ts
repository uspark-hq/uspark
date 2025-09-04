import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushCommand, pullCommand } from "../sync";
import { requireAuth } from "../shared";
import chalk from "chalk";
import * as fs from "fs/promises";
import type { Stats } from "fs";

vi.mock("../shared");
vi.mock("fs/promises");

describe("sync commands", () => {
  const mockSync = {
    pushFile: vi.fn(),
    pullFile: vi.fn(),
    syncFromRemote: vi.fn(),
    syncToRemote: vi.fn(),
  } as any;

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
        undefined,
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✓ Successfully pushed test.txt"),
      );
    });

    it("should push a single file with custom source path", async () => {
      await pushCommand("remote/path.txt", {
        projectId: "proj-123",
        source: "local/file.txt",
      });

      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "remote/path.txt",
        "local/file.txt",
        {
          token: "test-token",
          apiUrl: "https://api.test.com",
        },
      );
    });

    it("should push all files with --all flag", async () => {
      // Mock file system
      vi.mocked(fs.readdir).mockImplementation(async (dir) => {
        if (dir === ".") {
          return ["file1.txt", "file2.js", "subfolder", "node_modules"] as any;
        }
        if (dir === "subfolder") {
          return ["nested.md"] as any;
        }
        return [] as any;
      });

      vi.mocked(fs.stat).mockImplementation(async (path) => {
        const pathStr = path.toString();
        if (pathStr === "subfolder" || pathStr === "node_modules") {
          return {
            isDirectory: () => true,
          } as Stats;
        }
        return {
          isDirectory: () => false,
        } as Stats;
      });

      await pushCommand(undefined, {
        projectId: "proj-123",
        all: true,
      });

      // Should skip node_modules but push all other files
      expect(mockSync.pushFile).toHaveBeenCalledTimes(3);
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
      expect(mockSync.pushFile).toHaveBeenCalledWith(
        "proj-123",
        "subfolder/nested.md",
        "subfolder/nested.md",
        expect.any(Object),
      );
    });

    it("should handle errors during batch push gracefully", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["file1.txt", "file2.txt"] as any);
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