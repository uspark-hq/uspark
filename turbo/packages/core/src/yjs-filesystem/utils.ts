// Note: formatFileSize is already exported from blob/utils.ts
// Removed to avoid duplicate export

/**
 * Formats timestamp in human-readable format
 * @param mtime Timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatModifiedTime(mtime: number): string {
  return new Date(mtime).toLocaleString();
}

/**
 * Gets the file extension from a file path
 * @param path File path
 * @returns File extension (without dot) or empty string
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  const lastSlash = path.lastIndexOf("/");

  if (lastDot > lastSlash && lastDot > 0) {
    return path.slice(lastDot + 1).toLowerCase();
  }

  return "";
}

/**
 * Gets the file name from a file path
 * @param path File path
 * @returns File name
 */
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Gets the directory path from a file path
 * @param path File path
 * @returns Directory path or empty string for root files
 */
export function getDirectoryPath(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash > 0 ? path.slice(0, lastSlash) : "";
}
