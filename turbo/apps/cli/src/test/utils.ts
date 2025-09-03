import { server } from "./setup";
import { HttpHandler } from "msw";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock config directory for testing
export const createMockConfigDir = async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uspark-test-"));
  return tempDir;
};

// Clean up mock config directory
export const cleanupMockConfigDir = async (dir: string) => {
  await fs.rm(dir, { recursive: true, force: true });
};

// Add custom handler to MSW server
export const useHandler = (...handlers: HttpHandler[]) => {
  server.use(...handlers);
};

// Mock console methods to avoid noise in tests
export const mockConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });
  
  return {
    getLogCalls: () => (console.log as any).mock.calls,
    getErrorCalls: () => (console.error as any).mock.calls,
  };
};