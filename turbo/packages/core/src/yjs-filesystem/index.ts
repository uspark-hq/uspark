// Main exports for YJS filesystem functionality

export { parseYjsFileSystem, getFileFromYjs, getBlobFromYjs } from "./parser";

export {
  getBlobUrlPrefix,
  getBlobUrl,
  downloadFileContent,
  downloadFileBuffer,
} from "./blob-client";

export {
  formatModifiedTime,
  getFileExtension,
  getFileName,
  getDirectoryPath,
} from "./utils";

// Re-export formatFileSize from format-utils (client-safe) to maintain API consistency
export { formatFileSize } from "../blob/format-utils";

export type {
  YjsFileNode,
  YjsBlobInfo,
  FileItem,
  YjsFileSystem,
  YjsBlobConfig,
} from "./types";
