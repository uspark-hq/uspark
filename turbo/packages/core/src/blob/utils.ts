// Isomorphic utilities that work in both Node.js and browser environments
import { sha256 } from "js-sha256";

export function generateContentHash(content: Buffer | string): string {
  return sha256(content);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

export function detectContentType(buffer: Buffer): string {
  // Check for common image formats
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }

  // Check for text content (simple heuristic)
  const sample = buffer.slice(0, Math.min(buffer.length, 512));
  let isText = true;

  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Allow printable ASCII, tabs, newlines, and carriage returns
    if (
      byte !== 0x09 && // tab
      byte !== 0x0a && // newline
      byte !== 0x0d && // carriage return
      (byte < 0x20 || byte > 0x7e) // printable ASCII range
    ) {
      isText = false;
      break;
    }
  }

  if (isText) {
    return "text/plain";
  }

  // Default to binary
  return "application/octet-stream";
}
