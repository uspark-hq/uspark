import { describe, it, expect } from "vitest";
import { FileSystem } from "../fs";
import * as Y from "yjs";

describe("YJS FileSystem", () => {
  it("should create a file and read its content with UTF-8 encoding", async () => {
    const fs = new FileSystem();

    // Test content with multi-byte characters
    const content = "Hello, 世界! 🚀";
    await fs.writeFile("/test.txt", content);

    // Reading should return the original string
    const readContent = fs.readFile("/test.txt");
    expect(readContent).toBe(content);

    // Verify internal structure
    const fileNode = fs.getFileNode("/test.txt");
    expect(fileNode).toBeDefined();
    expect(fileNode?.hash).toBeDefined();
    expect(fileNode?.mtime).toBeGreaterThan(0);

    // Verify blob storage
    const blobInfo = fileNode ? fs.getBlobInfo(fileNode.hash) : undefined;

    // Size should be byte size, not character count
    const byteSize = new TextEncoder().encode(content).length;
    expect(blobInfo?.size).toBe(byteSize);
    expect(blobInfo?.size).not.toBe(content.length); // bytes ≠ characters
  });

  it("should generate correct update containing all files", async () => {
    const fs = new FileSystem();

    // Write multiple files
    await fs.writeFile("/file1.txt", "content1");
    await fs.writeFile("/dir/file2.txt", "content2");
    await fs.writeFile("/dir/nested/file3.txt", "content3");

    // Get the update
    const update = fs.getUpdate();

    // Update should not be empty
    expect(update.length).toBeGreaterThan(0);

    // Apply update to a new YDoc to verify it contains the data
    const newDoc = new Y.Doc();
    Y.applyUpdate(newDoc, update);

    // Verify all files exist in the new doc
    const files = newDoc.getMap("files");
    expect(files.get("/file1.txt")).toBeDefined();
    expect(files.get("/dir/file2.txt")).toBeDefined();
    expect(files.get("/dir/nested/file3.txt")).toBeDefined();

    // Verify blobs exist
    const blobs = newDoc.getMap("blobs");
    const file1Node = files.get("/file1.txt") as { hash: string };
    expect(file1Node).toBeDefined();
    expect(blobs.get(file1Node.hash)).toBeDefined();
  });

  it("should generate empty update for empty filesystem", () => {
    const fs = new FileSystem();

    // Get update without writing any files
    const update = fs.getUpdate();

    // Update should be minimal (just YDoc structure, no files)
    expect(update.length).toBeLessThan(20); // Empty YDoc update is very small

    // Apply to new doc and verify it's empty
    const newDoc = new Y.Doc();
    Y.applyUpdate(newDoc, update);

    const files = newDoc.getMap("files");
    expect(files.size).toBe(0);
  });

  it("should generate update that can be applied incrementally", async () => {
    const fs = new FileSystem();

    // Write first file
    await fs.writeFile("/file1.txt", "content1");
    const update1 = fs.getUpdate();

    // Write second file
    await fs.writeFile("/file2.txt", "content2");
    const update2 = fs.getUpdate();

    // Apply updates to separate docs
    const doc1 = new Y.Doc();
    Y.applyUpdate(doc1, update1);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, update2);

    // doc1 should have only file1
    const files1 = doc1.getMap("files");
    expect(files1.get("/file1.txt")).toBeDefined();
    expect(files1.get("/file2.txt")).toBeUndefined();

    // doc2 should have both files (since update2 contains full state)
    const files2 = doc2.getMap("files");
    expect(files2.get("/file1.txt")).toBeDefined();
    expect(files2.get("/file2.txt")).toBeDefined();
  });
});
