export const FOO = "hello";

export const BAR = "world";

export * from "./contracts";
export * from "./types";
export * from "./blob";
// Export only browser-compatible YJS filesystem utilities
// Import from specific files to avoid bundling Node.js-only modules
export {
  parseYjsFileSystem,
  getFileFromYjs,
  getBlobFromYjs,
} from "./yjs-filesystem/parser";
export {
  getBlobUrlPrefix,
  getBlobUrl,
  downloadFileContent,
  downloadFileBuffer,
} from "./yjs-filesystem/blob-client";
export {
  formatModifiedTime,
  getFileExtension,
  getFileName,
  getDirectoryPath,
} from "./yjs-filesystem/utils";
export { formatFileSize, generateContentHash } from "./blob/utils";
export type {
  YjsFileNode,
  YjsBlobInfo,
  FileItem,
  YjsFileSystem,
  YjsBlobConfig,
} from "./yjs-filesystem/types";
export * from "./utils/blocks";
