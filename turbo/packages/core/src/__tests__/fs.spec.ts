import { describe, it, expect } from "vitest";
import { FileSystem } from "../fs";

describe("YJS FileSystem", () => {
  it("should create a file and read its content with UTF-8 encoding", () => {
    const fs = new FileSystem();

    // Test content with multi-byte characters
    const content = "Hello, 世界! 🚀";
    fs.writeFile("/test.txt", content);

    // Reading should return the original string
    const readContent = fs.readFile("/test.txt");
    expect(readContent).toBe(content);

    // Verify internal structure
    const fileNode = fs.getFileNode("/test.txt");
    expect(fileNode).toBeDefined();
    expect(fileNode.hash).toBeDefined();
    expect(fileNode.mtime).toBeGreaterThan(0);

    // Verify blob storage
    const blobInfo = fs.getBlobInfo(fileNode.hash);
    
    // Size should be byte size, not character count
    const byteSize = new TextEncoder().encode(content).length;
    expect(blobInfo.size).toBe(byteSize);
    expect(blobInfo.size).not.toBe(content.length); // bytes ≠ characters
  });
});