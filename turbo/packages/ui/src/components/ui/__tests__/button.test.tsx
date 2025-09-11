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

  it("applies variant classes correctly", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveClass("bg-destructive");
  });

  it("applies size classes correctly", () => {
    render(<Button size="sm">Small button</Button>);
    const button = screen.getByRole("button", { name: "Small button" });
    expect(button).toHaveClass("h-9");
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled button</Button>);
    const button = screen.getByRole("button", { name: "Disabled button" });
    expect(button).toBeDisabled();
  });
});
