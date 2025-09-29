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