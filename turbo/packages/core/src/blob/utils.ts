import { createHash } from "crypto";

export function generateContentHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function detectContentType(content: Buffer): string {
  // Simple MIME type detection based on file headers
  if (content.length === 0) return "application/octet-stream";

  const header = content.subarray(0, 16);

  // Image formats
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return "image/png";
  }
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    return "image/gif";
  }

  // Text formats
  if (isTextContent(content)) {
    return "text/plain";
  }

  // Default
  return "application/octet-stream";
}

function isTextContent(content: Buffer): boolean {
  // Simple heuristic: check if most bytes are printable ASCII
  const sample = content.subarray(0, Math.min(1024, content.length));
  let printableCount = 0;

  for (const byte of sample) {
    if (
      (byte >= 32 && byte <= 126) ||
      byte === 9 ||
      byte === 10 ||
      byte === 13
    ) {
      printableCount++;
    }
  }

  return printableCount / sample.length > 0.95;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
