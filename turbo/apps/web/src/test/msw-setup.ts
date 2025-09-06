import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Create MSW server instance - handlers will be added in setup.ts
export const server = setupServer();

// Configure MSW to log all unhandled requests
server.events.on("request:unhandled", ({ request }) => {
  console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
});

// Setup MSW lifecycle hooks
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // Warn about unhandled requests but don't error
  });
});

afterEach(() => {
  // Don't reset handlers, keep our mocks in place
  // server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Export utilities for adding handlers in tests
export { http, HttpResponse };
