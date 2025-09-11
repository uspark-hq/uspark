import { cn } from "../utils";

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles conditional classes", () => {
    const condition1 = true;
    const condition2 = false;
    expect(
      cn(
        "base-class",
        condition1 && "conditional-class",
        condition2 && "not-included",
      ),
    ).toBe("base-class conditional-class");
  });

  it("handles empty values", () => {
    expect(cn("", null, undefined, "valid-class")).toBe("valid-class");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
