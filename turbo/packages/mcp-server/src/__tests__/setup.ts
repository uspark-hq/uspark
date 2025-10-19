import { beforeEach, vi } from "vitest";
import { mockServer } from "./mock-server";

beforeEach(() => {
  mockServer.reset();
  vi.clearAllMocks();
});
