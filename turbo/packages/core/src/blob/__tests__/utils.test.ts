import { describe, it, expect } from "vitest";
import {
  generateContentHash,
  detectContentType,
  formatFileSize,
} from "../utils";

describe("Blob Utils", () => {
  describe("generateContentHash", () => {
    it("should generate consistent SHA-256 hashes", () => {
      const content1 = Buffer.from("hello world");
      const content2 = Buffer.from("hello world");
      const content3 = Buffer.from("hello world!");

      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      const hash3 = generateContentHash(content3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle empty content", () => {
      const hash = generateContentHash(Buffer.alloc(0));
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });
  });

  describe("detectContentType", () => {
    it("should detect JPEG images", () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(detectContentType(jpegHeader)).toBe("image/jpeg");
    });

    it("should detect PNG images", () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(detectContentType(pngHeader)).toBe("image/png");
    });

    it("should detect GIF images", () => {
      const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(detectContentType(gifHeader)).toBe("image/gif");
    });

    it("should detect text content", () => {
      const textContent = Buffer.from("Hello, this is plain text!");
      expect(detectContentType(textContent)).toBe("text/plain");
    });

    it("should default to octet-stream for binary content", () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
      expect(detectContentType(binaryContent)).toBe("application/octet-stream");
    });

    it("should handle empty content", () => {
      const emptyContent = Buffer.alloc(0);
      expect(detectContentType(emptyContent)).toBe("application/octet-stream");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });

    it("should handle fractional sizes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });
});
