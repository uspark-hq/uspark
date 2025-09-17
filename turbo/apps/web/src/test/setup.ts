import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

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
process.env.GH_APP_PRIVATE_KEY = "test_private_key_placeholder";
process.env.GH_WEBHOOK_SECRET = "test_github_webhook_secret";

// Verify required environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for tests");
}
