import { expect, afterEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import "./msw-setup"; // Setup MSW for HTTP request mocking

expect.extend(matchers);

// Cleanup after each test when globals is disabled
afterEach(() => {
  cleanup();
});

// Polyfill URL.createObjectURL and URL.revokeObjectURL for jsdom
// jsdom doesn't support these APIs by default
global.URL.createObjectURL = () => "blob:mock-url";
global.URL.revokeObjectURL = () => {};

// Force override Clerk test environment variables for offline testing
// These are mock values that ensure tests never use real API credentials
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
  "pk_test_mock_instance.clerk.accounts.dev$";
process.env.CLERK_SECRET_KEY = "sk_test_mock_secret_key_for_testing";

// Mock blob storage environment variables for testing
// Format: vercel_blob_rw_[STORE_ID]_[SECRET]
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test-store_secret-key";

// Mock GitHub App environment variables for testing
// Note: These are test values that will be mocked by MSW, not used for real crypto
process.env.GH_APP_ID = "test_github_app_id";
// Base64 encoded test private key (decodes to "test_private_key_placeholder")
process.env.GH_APP_PRIVATE_KEY = Buffer.from(
  "test_private_key_placeholder",
).toString("base64");
process.env.GH_WEBHOOK_SECRET = "test_github_webhook_secret";

// Verify required environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for tests");
}

// Mock next/headers for testing
vi.mock("next/headers", () => ({
  headers: vi.fn(() => {
    const h = new Headers();
    // Return empty headers by default, tests can override if needed
    return h;
  }),
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));

// Mock Claude token crypto for testing
vi.mock("../lib/claude-token-crypto", () => ({
  encryptClaudeToken: vi.fn((token: string) => `encrypted_${token}`),
  decryptClaudeToken: vi.fn((encrypted: string) =>
    encrypted.replace("encrypted_", ""),
  ),
  getTokenPrefix: vi.fn((token: string) => token.substring(0, 10) + "..."),
  isValidClaudeToken: vi.fn(() => true),
  getEncryptionKey: vi.fn(() => Buffer.from("test-encryption-key")),
}));


interface CommandOptions {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  timeout?: number;
}
// Mock E2B SDK for testing
vi.mock("e2b", () => ({
  Sandbox: {
    create: vi.fn().mockImplementation(() => {
      // Mock sandbox with Claude streaming output
      const mockSandbox = {
        sandboxId: "mock-sandbox",
        commands: {
          run: vi.fn().mockImplementation((command: string, options?: CommandOptions) => {
            // If this is a Claude command with streaming, call onStdout callbacks
            if (command.includes("claude") && options?.onStdout) {
              // Simulate streaming Claude output blocks
              const blocks = [
                JSON.stringify({
                  type: "assistant",
                  message: {
                    content: [{ type: "text", text: "Mock response" }],
                  },
                }),
                JSON.stringify({
                  type: "result",
                  total_cost_usd: 0.001,
                  usage: { input_tokens: 10, output_tokens: 20 },
                  duration_ms: 100,
                }),
              ];

              // Call onStdout for each block to simulate streaming
              blocks.forEach((block) => {
                options.onStdout(block + "\n");
              });
            }

            return Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: "",
            });
          }),
        },
        files: {
          write: vi.fn(),
        },
        setTimeout: vi.fn(),
        kill: vi.fn(),
      };
      return Promise.resolve(mockSandbox);
    }),
    connect: vi.fn().mockImplementation(() => {
      // Same mock for connect
      const mockSandbox = {
        sandboxId: "mock-sandbox",
        commands: {
          run: vi.fn().mockImplementation((command: string, options?: CommandOptions) => {
            // If this is a Claude command with streaming, call onStdout callbacks
            if (command.includes("claude") && options?.onStdout) {
              // Simulate streaming Claude output blocks
              const blocks = [
                JSON.stringify({
                  type: "assistant",
                  message: {
                    content: [{ type: "text", text: "Mock response" }],
                  },
                }),
                JSON.stringify({
                  type: "result",
                  total_cost_usd: 0.001,
                  usage: { input_tokens: 10, output_tokens: 20 },
                  duration_ms: 100,
                }),
              ];

              // Call onStdout for each block to simulate streaming
              blocks.forEach((block) => {
                options.onStdout(block + "\n");
              });
            }

            return Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: "",
            });
          }),
        },
        files: {
          write: vi.fn(),
        },
        setTimeout: vi.fn(),
        kill: vi.fn(),
      };
      return Promise.resolve(mockSandbox);
    }),
    list: vi.fn().mockResolvedValue({
      nextItems: vi.fn().mockResolvedValue([]),
    }),
  },
}));
