import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TokenForm } from "./token-form";
import type { GenerateTokenResult } from "./actions";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("TokenForm", () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form with required fields", () => {
    render(<TokenForm action={mockAction} />);
    
    expect(screen.getByLabelText("Token Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., My Development Token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Token" })).toBeInTheDocument();
  });

  it("should show loading state when form is submitted", async () => {
    const pendingAction = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<TokenForm action={pendingAction} />);
    
    const nameInput = screen.getByLabelText("Token Name");
    const submitButton = screen.getByRole("button", { name: "Generate Token" });
    
    fireEvent.change(nameInput, { target: { value: "Test Token" } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generating..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Generating..." })).toBeDisabled();
    });
  });

  it("should display success result with token", async () => {
    const successResult: GenerateTokenResult = {
      success: true,
      data: {
        token: "usp_live_test123",
        name: "Test Token",
        expires_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    };

    const actionMock = vi.fn().mockResolvedValue(successResult);
    render(<TokenForm action={actionMock} />);
    
    // Simulate form submission and success
    const nameInput = screen.getByLabelText("Token Name");
    fireEvent.change(nameInput, { target: { value: "Test Token" } });
    
    const submitButton = screen.getByRole("button", { name: "Generate Token" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Your New Token")).toBeInTheDocument();
      expect(screen.getByText("usp_live_test123")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copy Token" })).toBeInTheDocument();
    });
  });

  it("should display error message on failure", async () => {
    const errorResult: GenerateTokenResult = {
      success: false,
      error: {
        error: "invalid_request",
        error_description: "Token name is required",
      },
    };

    const actionMock = vi.fn().mockResolvedValue(errorResult);
    render(<TokenForm action={actionMock} />);
    
    const submitButton = screen.getByRole("button", { name: "Generate Token" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Token name is required")).toBeInTheDocument();
    });
  });

  it("should copy token to clipboard when copy button is clicked", async () => {
    const successResult: GenerateTokenResult = {
      success: true,
      data: {
        token: "usp_live_test123",
        name: "Test Token",
        expires_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    };

    const actionMock = vi.fn().mockResolvedValue(successResult);
    render(<TokenForm action={actionMock} />);
    
    // First submit form to get token
    const nameInput = screen.getByLabelText("Token Name");
    fireEvent.change(nameInput, { target: { value: "Test Token" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy Token" })).toBeInTheDocument();
    });

    // Click copy button
    fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("usp_live_test123");
      expect(screen.getByRole("button", { name: "✓ Copied!" })).toBeInTheDocument();
    });
  });

  it("should require token name input", () => {
    render(<TokenForm action={mockAction} />);
    
    const nameInput = screen.getByLabelText("Token Name");
    expect(nameInput).toBeRequired();
  });

  it("should include hidden expires_in_days field", () => {
    render(<TokenForm action={mockAction} />);
    
    const hiddenInput = document.querySelector('input[name="expires_in_days"]') as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput.type).toBe("hidden");
    expect(hiddenInput.value).toBe("90");
  });
});