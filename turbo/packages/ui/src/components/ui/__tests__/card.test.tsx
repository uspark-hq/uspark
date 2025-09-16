/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../card";

describe("Card", () => {
  it("renders basic card correctly", () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>,
    );
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders card with header elements", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>,
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description text")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-lg", "border", "bg-card");
  });
});
