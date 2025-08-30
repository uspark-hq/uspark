import { FOO } from "@makita/core";
import { test, expect, describe } from "vitest";

describe("CLI Tests", () => {
  test("should import FOO from core", () => {
    expect(FOO).toBe("hello");
  });

  test("should run in test environment", () => {
    expect(typeof process.version).toBe("string");
  });
});
