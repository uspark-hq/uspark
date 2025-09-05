import "@testing-library/jest-dom/vitest";
import { server, http, HttpResponse } from "./msw-setup";
import { handlers } from "./msw-handlers";

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
process.env.BLOB_READ_WRITE_TOKEN = "dummy_token";

// Verify required environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for tests");
}

// Set up MSW handlers for Clerk API mocking
server.use(
  ...handlers,
  // Add catch-all handler at the end to block unmocked requests
  http.all("*", ({ request }) => {
    // Allow local requests (database, etc.)
    const url = new URL(request.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      // Don't intercept local requests
      return;
    }

    // Log and block external requests
    console.error(
      `[MSW] Blocked unmocked external request: ${request.method} ${request.url}`,
    );

    // Return error response for unmocked external requests
    return new HttpResponse(
      JSON.stringify({
        error: "Network request blocked in test environment",
        message: "All external API calls must be mocked in tests",
        url: request.url,
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }),
);
