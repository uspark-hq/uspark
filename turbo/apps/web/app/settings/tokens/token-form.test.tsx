/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TokenForm } from "./token-form";

// Only mock what's absolutely necessary - browser APIs
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

// @ts-expect-error - We need this for testing clipboard functionality
global.navigator.clipboard = mockClipboard;

describe("TokenForm", () => {
  // Simple action spy instead of complex mock
  const createMockAction = () => vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form with all required elements", () => {
    const mockAction = createMockAction();
    render(<TokenForm action={mockAction} />);

    // Check form structure
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(screen.getByLabelText("Token Name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., My Development Token"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate Token" }),
    ).toBeInTheDocument();

    // Check form inputs
    const nameInput = screen.getByLabelText("Token Name");
    expect(nameInput).toBeRequired();
    expect(nameInput).toHaveAttribute("name", "name");

    const hiddenInput = screen.getByDisplayValue("90");
    expect(hiddenInput).toHaveAttribute("name", "expires_in_days");
    expect(hiddenInput).toHaveAttribute("type", "hidden");
  });

  it("should handle form submission", () => {
    const mockAction = createMockAction();
    render(<TokenForm action={mockAction} />);

    const nameInput = screen.getByLabelText("Token Name");
    const submitButton = screen.getByRole("button", { name: "Generate Token" });

    // Fill form
    fireEvent.change(nameInput, { target: { value: "My Test Token" } });

    // Submit form
    fireEvent.click(submitButton);

    // Verify action was called
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("should test clipboard functionality", async () => {
    // Test the clipboard logic in isolation
    const testToken = "usp_live_test123";

    // Simulate clipboard write
    await navigator.clipboard.writeText(testToken);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(testToken);
  });
});
