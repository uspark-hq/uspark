import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers } from "./msw-handlers";

// Create MSW server instance with default handlers
export const server = setupServer(...handlers);

// Setup MSW lifecycle hooks
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
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
