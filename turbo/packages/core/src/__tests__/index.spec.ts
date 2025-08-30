import { expect, test } from "vitest";
import { FOO } from "../index.js";

test("index", () => {
  expect(FOO).toBe("hello");
});
