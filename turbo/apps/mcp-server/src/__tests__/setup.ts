import { beforeAll, afterEach, afterAll, beforeEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { mockServer, handlers } from "./mock-server";

// Setup MSW server
const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  mockServer.reset();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Keep beforeEach for backwards compatibility
beforeEach(() => {
  mockServer.reset();
  vi.clearAllMocks();
});
