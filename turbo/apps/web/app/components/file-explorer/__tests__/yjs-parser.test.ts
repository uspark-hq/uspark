import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { parseYjsFileSystem, formatFileSize, formatModifiedTime } from "../yjs-parser";

describe("YJS Parser", () => {
  function createTestYjsDocument(): Uint8Array {
    const ydoc = new Y.Doc();
    const filesMap = ydoc.getMap("files");
    const blobsMap = ydoc.getMap("blobs");

    // Add test files
    const testFiles = [
      { path: "src/index.ts", hash: "hash1", size: 100, mtime: 1703123400000 },
      { path: "src/components/Button.tsx", hash: "hash2", size: 200, mtime: 1703123500000 },
      { path: "src/utils/helpers.ts", hash: "hash3", size: 150, mtime: 1703123600000 },
      { path: "package.json", hash: "hash4", size: 300, mtime: 1703123700000 },
      { path: "README.md", hash: "hash5", size: 80, mtime: 1703123800000 }
    ];

    testFiles.forEach(file => {
      filesMap.set(file.path, { hash: file.hash, mtime: file.mtime });
      blobsMap.set(file.hash, { size: file.size });
    });

    return Y.encodeStateAsUpdate(ydoc);
  }

  describe("parseYjsFileSystem", () => {
    it("parses YJS document and creates correct file tree", () => {
      const yjsData = createTestYjsDocument();
      const result = parseYjsFileSystem(yjsData);

      expect(result.fileCount).toBe(5);
      expect(result.totalSize).toBe(830); // 100 + 200 + 150 + 300 + 80
      expect(result.files).toHaveLength(3); // src directory, package.json, README.md
      
      // Check root level structure
      const srcDir = result.files.find(f => f.path === "src");
      const packageJson = result.files.find(f => f.path === "package.json");
      const readmeMd = result.files.find(f => f.path === "README.md");

      expect(srcDir?.type).toBe("directory");
      expect(srcDir?.children).toHaveLength(3); // components directory, utils directory, and index.ts
      
      expect(packageJson?.type).toBe("file");
      expect(packageJson?.size).toBe(300);
      
      expect(readmeMd?.type).toBe("file");
      expect(readmeMd?.size).toBe(80);
    });

    it("preserves YJS metadata in file items", () => {
      const yjsData = createTestYjsDocument();
      const result = parseYjsFileSystem(yjsData);

      const packageJson = result.files.find(f => f.path === "package.json");
      
      expect(packageJson?.mtime).toBe(1703123700000);
      expect(packageJson?.hash).toBe("hash4");
    });

    it("handles empty YJS document", () => {
      const ydoc = new Y.Doc();
      const yjsData = Y.encodeStateAsUpdate(ydoc);
      
      const result = parseYjsFileSystem(yjsData);
      
      expect(result.fileCount).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.files).toHaveLength(0);
    });

    it("handles files without blob size information", () => {
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      
      // Add file without corresponding blob entry
      filesMap.set("orphan.txt", { hash: "orphan_hash", mtime: Date.now() });
      
      const yjsData = Y.encodeStateAsUpdate(ydoc);
      const result = parseYjsFileSystem(yjsData);
      
      expect(result.fileCount).toBe(1);
      expect(result.totalSize).toBe(0); // No size info available
      expect(result.files[0]?.size).toBeUndefined();
    });

    it("creates nested directory structure correctly", () => {
      const ydoc = new Y.Doc();
      const filesMap = ydoc.getMap("files");
      const blobsMap = ydoc.getMap("blobs");

      const deepFile = "src/components/ui/buttons/PrimaryButton.tsx";
      filesMap.set(deepFile, { hash: "deep_hash", mtime: Date.now() });
      blobsMap.set("deep_hash", { size: 500 });

      const yjsData = Y.encodeStateAsUpdate(ydoc);
      const result = parseYjsFileSystem(yjsData);

      // Should create nested structure: src -> components -> ui -> buttons -> PrimaryButton.tsx
      const srcDir = result.files.find(f => f.path === "src");
      expect(srcDir?.type).toBe("directory");
      expect(srcDir?.children?.length).toBe(1);

      const componentsDir = srcDir?.children?.find(f => f.path === "src/components");
      expect(componentsDir?.type).toBe("directory");
      expect(componentsDir?.children?.length).toBe(1);

      const uiDir = componentsDir?.children?.find(f => f.path === "src/components/ui");
      expect(uiDir?.type).toBe("directory");
      expect(uiDir?.children?.length).toBe(1);

      const buttonsDir = uiDir?.children?.find(f => f.path === "src/components/ui/buttons");
      expect(buttonsDir?.type).toBe("directory");
      expect(buttonsDir?.children?.length).toBe(1);

      const primaryButton = buttonsDir?.children?.find(f => f.path === deepFile);
      expect(primaryButton?.type).toBe("file");
      expect(primaryButton?.size).toBe(500);
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });
  });

  describe("formatModifiedTime", () => {
    it("formats timestamp correctly", () => {
      const timestamp = 1703123400000; // 2023-12-21 02:10:00 UTC
      const formatted = formatModifiedTime(timestamp);
      
      // Should contain date and time (exact format depends on locale)
      expect(formatted).toContain("2023");
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});