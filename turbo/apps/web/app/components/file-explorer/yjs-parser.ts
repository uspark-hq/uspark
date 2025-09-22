"use client";

import {
  parseYjsFileSystem as parseYjs,
  formatFileSize as formatSize,
  formatModifiedTime as formatTime,
} from "@uspark/core";

// Re-export functions from core package
export const parseYjsFileSystem = parseYjs;
export const formatFileSize = formatSize;
export const formatModifiedTime = formatTime;
