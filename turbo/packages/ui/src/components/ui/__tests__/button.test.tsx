/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled button</Button>);
    const button = screen.getByRole("button", { name: "Disabled button" });
    expect(button).toBeDisabled();
  });
});
