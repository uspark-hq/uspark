import { describe, it, expect, beforeEach } from "vitest";
import {
  BlobTestUtils,
  getBlobTestUtils,
  resetBlobTestUtils,
} from "../test-utils";

describe("BlobTestUtils", () => {
  let testUtils: BlobTestUtils;

  beforeEach(() => {
    testUtils = new BlobTestUtils();
  });

  describe("createTestBlob", () => {
    it("should create blob with consistent hash", async () => {
      const content = "Test blob content";

      const { hash: hash1, content: buffer1 } =
        await testUtils.createTestBlob(content);
      const { hash: hash2, content: buffer2 } =
        await testUtils.createTestBlob(content);

      expect(hash1).toBe(hash2);
      expect(buffer1).toEqual(buffer2);
      expect(buffer1.toString()).toBe(content);
    });

    it("should respect content type", async () => {
      const content = '{"test": true}';
      const { hash } = await testUtils.createTestBlob(
        content,
        "application/json",
      );

      const storage = testUtils.getStorage();
      const metadata = (await storage.list()).find((m) => m.hash === hash);
      expect(metadata?.contentType).toBe("application/json");
    });
  });

  describe("createBinaryTestBlob", () => {
    it("should create blob from byte array", async () => {
      const data = [0x48, 0x65, 0x6c, 0x6c, 0x6f]; // "Hello"
      const { hash, content } = await testUtils.createBinaryTestBlob(data);

      expect(content).toEqual(Buffer.from(data));
      expect(content.toString()).toBe("Hello");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("createTestFile", () => {
    it("should create file with metadata", async () => {
      const name = "test.txt";
      const content = "File content";

      const file = await testUtils.createTestFile(name, content);

      expect(file.name).toBe(name);
      expect(file.content.toString()).toBe(content);
      expect(file.size).toBe(content.length);
      expect(file.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("generateTestHash", () => {
    it("should generate consistent hashes", () => {
      const content = "Hash test content";

      const hash1 = testUtils.generateTestHash(content);
      const hash2 = testUtils.generateTestHash(content);
      const hash3 = testUtils.generateTestHash(content + "!");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("createTestContent", () => {
    it("should create content of specified size", () => {
      const size = 1000;
      const content = testUtils.createTestContent(size);

      expect(content.length).toBe(size);
      expect(content.toString()).toBe("a".repeat(size));
    });

    it("should use custom pattern", () => {
      const size = 50;
      const pattern = "x";
      const content = testUtils.createTestContent(size, pattern);

      expect(content.length).toBe(size);
      expect(content.toString()).toBe(pattern.repeat(size));
    });
  });

  describe("createLargeTestContent", () => {
    it("should create content of specified size in MB", () => {
      const sizeMB = 2;
      const content = testUtils.createLargeTestContent(sizeMB);

      expect(content.length).toBe(sizeMB * 1024 * 1024);
      expect(content.toString().startsWith("x".repeat(1024))).toBe(true);
    });
  });

  describe("stats and utilities", () => {
    it("should track storage statistics", async () => {
      await testUtils.createTestBlob("Content 1");
      await testUtils.createTestBlob("Content 2");
      await testUtils.createTestBlob("Longer content string");

      const stats = testUtils.getStats();

      expect(stats.count).toBe(3);
      expect(stats.totalSize).toBe(9 + 9 + 21); // Sum of content lengths
      expect(stats.hashes).toHaveLength(3);
      expect(stats.hashes[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should clear storage", async () => {
      await testUtils.createTestBlob("Test content");
      expect(testUtils.getStats().count).toBe(1);

      testUtils.clear();
      expect(testUtils.getStats().count).toBe(0);
    });
  });
});

describe("getBlobTestUtils singleton", () => {
  it("should return same instance", () => {
    const utils1 = getBlobTestUtils();
    const utils2 = getBlobTestUtils();

    expect(utils1).toBe(utils2);
  });

  it("should reset singleton", async () => {
    const utils1 = getBlobTestUtils();
    await utils1.createTestBlob("Test content");
    expect(utils1.getStats().count).toBe(1);

    resetBlobTestUtils();

    const utils2 = getBlobTestUtils();
    expect(utils2.getStats().count).toBe(0);
  });
});
