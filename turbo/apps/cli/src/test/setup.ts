import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

// Create MSW server instance
export const server = setupServer();

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
