import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

// Setup MSW server
export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
