import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushCommand } from "../commands/sync";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { setOverrideConfig } from "../config";
import { put } from "@vercel/blob";

// Mock @vercel/blob
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

describe("Push Multiple Different Blobs", () => {
  let tempDir: string;
  const testProjectId = "test-multi-blob";

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), "uspark-blob-test-"));
    process.chdir(tempDir);

    // Setup config
    setOverrideConfig({
      token: "test-token",
      apiUrl: "http://localhost:3000",
    });

    // Reset mocks
    vi.clearAllMocks();

    // Mock put to track calls
    vi.mocked(put).mockImplementation(async (pathname, content) => {
      console.log(
        `[TEST] put called with pathname: ${pathname}, content length: ${content.toString().length}`,
      );
      return {
        url: `https://test.blob.storage/${pathname}`,
        pathname,
        contentType: "text/plain",
        downloadUrl: `https://test.blob.storage/${pathname}`,
      };
    });

    // Mock console
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    setOverrideConfig(null);
    vi.restoreAllMocks();
  });

  it("should upload ALL unique blobs when pushing multiple files", async () => {
    // Create 3 files with 3 DIFFERENT contents
    await writeFile("file1.md", "content-one");
    await writeFile("file2.md", "content-two");
    await writeFile("file3.md", "content-three");

    // Push all files
    await pushCommand(undefined, {
      projectId: testProjectId,
      all: true,
    });

    // CRITICAL: Verify put was called 3 times (one for each unique content)
    expect(put).toHaveBeenCalledTimes(3);

    // Verify each unique blob was uploaded
    const calls = vi.mocked(put).mock.calls;
    const uploadedPaths = calls.map((call) => call[0]);
    const uploadedContents = calls.map((call) => call[1]);

    // Should have 3 different blob uploads
    expect(uploadedContents).toContain("content-one");
    expect(uploadedContents).toContain("content-two");
    expect(uploadedContents).toContain("content-three");

    // Each should have project ID in path
    uploadedPaths.forEach((path) => {
      expect(path).toContain(testProjectId);
    });
  });

  it("should upload only unique blobs when files have duplicate content", async () => {
    // Create 4 files with only 2 unique contents
    await writeFile("file1.md", "duplicate-content");
    await writeFile("file2.md", "duplicate-content"); // Same as file1
    await writeFile("file3.md", "unique-content");
    await writeFile("file4.md", "duplicate-content"); // Same as file1 & file2

    // Push all files
    await pushCommand(undefined, {
      projectId: testProjectId,
      all: true,
    });

    // Should upload only 2 blobs (unique contents only)
    expect(put).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(put).mock.calls;
    const uploadedContents = calls.map((call) => call[1]);

    // Should have both unique contents
    expect(uploadedContents).toContain("duplicate-content");
    expect(uploadedContents).toContain("unique-content");
  });

  it("should handle the hello/foo/bar scenario correctly", async () => {
    // Reproduce the exact bug scenario
    await writeFile("foo.md", "foo");
    await writeFile("bar.md", "bar");
    await writeFile("hello.md", "hello");

    // Push all files
    await pushCommand(undefined, {
      projectId: testProjectId,
      all: true,
    });

    // MUST upload 3 blobs for 3 different contents
    expect(put).toHaveBeenCalledTimes(3);

    const calls = vi.mocked(put).mock.calls;
    const uploadedContents = new Set(calls.map((call) => call[1]));

    // All three unique contents must be uploaded
    expect(uploadedContents.has("foo")).toBe(true);
    expect(uploadedContents.has("bar")).toBe(true);
    expect(uploadedContents.has("hello")).toBe(true);
  });

  it("should not re-upload blobs on second push of same content", async () => {
    // First push
    await writeFile("test.md", "test-content");
    await pushCommand("test.md", { projectId: testProjectId });

    expect(put).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // Second push of same file (no changes)
    await pushCommand("test.md", { projectId: testProjectId });

    // Should NOT upload blob again
    expect(put).toHaveBeenCalledTimes(0);
  });

  it("should track blob uploads in console output", async () => {
    // Create multiple files
    await writeFile("a.txt", "alpha");
    await writeFile("b.txt", "beta");
    await writeFile("c.txt", "gamma");

    // Mock console.log to capture output
    const logSpy = vi.fn();
    console.log = logSpy;

    await pushCommand(undefined, {
      projectId: testProjectId,
      all: true,
    });

    // Should log blob upload for each unique content
    const blobUploadLogs = logSpy.mock.calls.filter((call) =>
      call[0]?.includes("Blob uploaded successfully"),
    );

    // Should have 3 blob upload logs
    expect(blobUploadLogs).toHaveLength(3);
  });
});
