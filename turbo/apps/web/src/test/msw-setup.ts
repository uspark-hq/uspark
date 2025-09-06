import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers } from "./msw-handlers";

// Create MSW server instance with default handlers
export const server = setupServer(...handlers);

// Configure MSW to log all unhandled requests
server.events.on("request:unhandled", ({ request }) => {
  console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
});

// Setup MSW lifecycle hooks
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "bypass", // Let unhandled requests pass through
  });
});

afterEach(() => {
  // Reset handlers to restore the defaults from msw-handlers.ts
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Export utilities for adding handlers in tests
export { http, HttpResponse };
